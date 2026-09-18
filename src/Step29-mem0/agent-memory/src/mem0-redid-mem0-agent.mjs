/**
 * 设计对照（当初的结构 vs 当前实现）
 *
 * 分层：
 * - Redis：短时会话记忆。存完整对话，带 TTL，会话结束/过期即丢。
 * - Mem0 用户层：跨会话长期事实（身份、居住地、爱好、饮食禁忌）。
 * - Mem0 会话层：仅当前 thread 有效的任务/大纲/进度/待办（用 runId=sessionId）。
 *
 * 单轮流水线（invokeTurn）：
 * 1. 读 Redis 历史
 * 2. 检索 Mem0 用户层 + 会话层
 * 3. 拼成 SystemMessage，注入本轮 Agent
 * 4. Agent 结合「长期记忆 + 会话记忆 + Redis 近期对话」回答
 * 5. 把本轮完整消息写回 Redis
 * 6. 分类器判断 write_user / write_session（可同时为 true）
 * 7. 按决策写入 Mem0
 *
 * 和当初草稿的差异：分类发生在 Agent 回复之后。
 * 当初是先分类再回答；现在是先回答，再拿「用户输入 + 助手回复」一起分类，避免漏掉回复里确认的事实。
 */
import 'dotenv/config';
import { Redis } from 'ioredis';
import { ChatOpenAI } from '@langchain/openai';
import {
  HumanMessage,
  SystemMessage,
  mapChatMessagesToStoredMessages,
  mapStoredMessagesToChatMessages,
} from '@langchain/core/messages';
import { MemoryClient } from 'mem0ai';
import { z } from 'zod';
import { createAgent, summarizationMiddleware } from 'langchain';
import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

// ---------- 作用域 ID：用户跨会话；session 对应 Mem0 runId 和 Redis key ----------
const USER_ID = process.env.MEM0_USER_ID?.trim() || 'demo_user_001';
const SESSION_ID = process.env.MEMORY_SESSION_ID?.trim() || 'session_001';
const PREFIX = 'memory-agent';
const TTL_SECONDS = Number(process.env.MEMORY_TTL_SECONDS ?? 60 * 60 * 24);
const TOP_K = Number(process.env.MEM0_TOP_K ?? 5);

// ---------- 分类器 schema：决定本轮写用户层、会话层，或都不写 ----------
const promptSchema = z.object({
  write_user: z
    .boolean()
    .describe(
      '写入用户层：换一个新会话仍应保留的长期事实（身份、居住地、长期爱好、饮食禁忌、持久偏好）。不含仅本轮任务。',
    ),
  write_session: z
    .boolean()
    .describe(
      '写入会话层：仅当前会话/thread 有效的任务、大纲、进度、待办、临时决策（如「这次先写...」「数据部分明天补」）。',
    ),
  reason: z.string().describe('决策理由，一句话'),
});

// 聊天模型：Agent 回答 + 分类器共用
const model = new ChatOpenAI({
  model:
    process.env.MODEL?.trim() || process.env.MODEL_NAME?.trim() || 'qwen-plus',
  temperature: 0,
  apiKey:
    process.env.OPEN_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim(),
  configuration: {
    baseURL:
      process.env.OPEN_BASE_URL?.trim() || process.env.OPENAI_BASE_URL?.trim(),
  },
});

// 强制按 schema 输出，对应当初 getInvokeWay 的「先决策再落库」
const classifier = model.withStructuredOutput(promptSchema);

// 分类规则：长期进 user，本轮任务进 session，寒暄不写
const classifierPrompt = `你是记忆分层分类器。判断本轮对话是否有「新事实」需写入 Mem0，并分到正确层级。
## user 层（跨会话长期）
- 用户身份与画像：姓名、职业、居住地、长期爱好
- 长期偏好与约束：饮食过敏、回答风格、常用技术栈
- 持续数周以上的个人背景（非单次任务）

## session 层（仅当前会话）
- 当前正在做的任务、目标、文档大纲、方案草稿
- 本会话内的进度、决策、待办、临时约定
- 用户明确用「这次」「本轮」「当前会话」描述的工作上下文

## 均不写入
- 寒暄、致谢、纯确认
- 助手生成的通用内容（攻略、示例代码、建议清单），用户未明确采纳为新事实
- 无信息增量的复述

## 决策原则
1. 「这次我们先写 Q1 总结」「当前在排查 XX」→ 优先 session，不要标成 user
2. user 与 session 可同时为 true（如同时说职业+当前任务），但勿把纯会话任务只标 user
3. 一次性请求（如「帮我做旅行攻略」）且未产生需跨轮记住的约定 → 均为 false`;

const summaryPrompt = `你是对话摘要助手。用中文简洁总结：话题、会话内进度/报错/待办。
用户级长期偏好由外部记忆维护，摘要勿重复堆砌。不要编造。

待摘要的对话：
{messages}

摘要：`;

// Redis 对话变长后，中间件做短摘要；长期偏好交给 Mem0，摘要里不重复堆
const agent = createAgent({
  systemPrompt:
    '你是信息助手。结合系统里的长期记忆和当前会话上下文回答，并记住用户提供的关键信息。',
  model,
  tools: [],
  middleware: [
    summarizationMiddleware({
      summaryPrompt,
      trigger: { messages: 8 },
      keep: { messages: 4 },
      model,
    }),
  ],
});

// 短时记忆客户端：只负责连 Redis
const redis = new Redis({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
  ...(process.env.REDIS_PASSWORD
    ? { password: process.env.REDIS_PASSWORD }
    : {}),
});

// 长期/会话记忆客户端：只负责连 Mem0
const mem0Client = new MemoryClient({
  apiKey: process.env.MEM0_API_KEY,
});

// 把 Mem0 检索结果收成可注入 prompt 的条目
const formatMemories = (payload) => {
  const items = payload?.results ?? [];
  if (!items.length) {
    return '无';
  }
  return items
    .map((item) => `- ${item.memory ?? item.text ?? ''}`)
    .filter((line) => line !== '- ')
    .join('\n');
};

// Agent 回复可能是 string 或多段 content，落 Mem0 前先收成纯文本
const toText = (content) => {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : (part?.text ?? '')))
      .join('');
  }
  return String(content ?? '');
};

// Mem0 封装：用户层用 userId，会话层额外挂 runId（对应当初的 sessionId）
class Mem0Memory {
  constructor(client, userId, sessionId) {
    this.client = client;
    this.userId = userId;
    this.sessionId = sessionId;
  }

  // 按分类器两个开关分别落库；两层可同时写，不再互斥
  async addMemory({ writeUser, writeSession, messages }) {
    const writes = [];

    if (writeUser) {
      writes.push(
        this.client.add(messages, {
          userId: this.userId,
        }),
      );
    }

    if (writeSession) {
      writes.push(
        this.client.add(messages, {
          userId: this.userId,
          runId: this.sessionId,
        }),
      );
    }

    if (!writes.length) {
      return [];
    }

    return Promise.all(writes);
  }

  // 回答前同时召回两层，避免只带长期记忆、丢掉本会话任务上下文
  async searchMemory(query) {
    const [userMemories, sessionMemories] = await Promise.all([
      this.client.search(query, {
        filters: { user_id: this.userId },
        topK: TOP_K,
      }),
      this.client.search(query, {
        filters: { run_id: this.sessionId },
        topK: TOP_K,
      }),
    ]);

    return { userMemories, sessionMemories };
  }

  // 当初的 buildSystemMessage：把 Mem0 结果变成 Agent 可读的系统提示
  buildSystemMessage(userMemories, sessionMemories) {
    return new SystemMessage(
      `以下是可参考的记忆，不要编造记忆中不存在的事实。

      ## 用户长期记忆
      ${formatMemories(userMemories)}

      ## 当前会话记忆
      ${formatMemories(sessionMemories)}`,
    );
  }
}

// Redis 封装：短时完整对话。过期后只剩 Mem0 里抽取出的事实
class RedisStore {
  constructor(client, { prefix, sessionId, ttlSeconds } = {}) {
    this.redis = client;
    this.prefix = prefix;
    this.sessionId = sessionId;
    this.ttlSeconds = ttlSeconds ?? TTL_SECONDS;
  }

  getMessagesKey(userId) {
    return `${this.prefix}:${this.sessionId}:${userId}:messages`;
  }

  // 读出后反序列化成 LangChain 消息，才能继续拼进 Agent
  async getMessages(userId) {
    const raw = await this.redis.get(this.getMessagesKey(userId));
    if (!raw) {
      return [];
    }
    return mapStoredMessagesToChatMessages(JSON.parse(raw));
  }

  // 写入时序列化，并刷新 TTL（对应当初看 ttl 判断会话是否还活着）
  async setMessages(userId, messages) {
    const payload = JSON.stringify(mapChatMessagesToStoredMessages(messages));
    await this.redis.set(
      this.getMessagesKey(userId),
      payload,
      'EX',
      this.ttlSeconds,
    );
  }

  async getTtl(userId) {
    return this.redis.ttl(this.getMessagesKey(userId));
  }

  async clear(userId) {
    await this.redis.del(this.getMessagesKey(userId));
  }
}

// 对应当初 getInvokeWay：只做分层决策，不负责回答用户
const classifyTurn = async (userText, assistantText) => {
  return classifier.invoke([
    new SystemMessage(classifierPrompt),
    new HumanMessage(
      `用户：${userText}\n助手：${assistantText || '（尚未回复）'}`,
    ),
  ]);
};

// 单轮主路径：读记忆 → 回答 → 回写 Redis → 分类 → 回写 Mem0
const invokeTurn = async ({
  agentInstance,
  redisStore,
  mem0Memory,
  userId,
  content,
}) => {
  // 1. Redis：当前会话近期完整对话
  const history = await redisStore.getMessages(userId);

  // 2. Mem0：用户长期事实 + 本会话任务上下文
  const { userMemories, sessionMemories } =
    await mem0Memory.searchMemory(content);

  // 3. 两层记忆合成一条系统提示，供本轮回答使用
  const memoryMessage = mem0Memory.buildSystemMessage(
    userMemories,
    sessionMemories,
  );

  // 4. Agent 回答。消息顺序：Mem0 记忆 → Redis 历史 → 本轮用户输入
  const result = await agentInstance.invoke({
    messages: [memoryMessage, ...history, new HumanMessage(content)],
  });
  const messages = result.messages ?? [];
  const reply = toText(messages.at(-1)?.content);

  // 5. 短时记忆回写：完整消息列表进 Redis，并续期 TTL
  await redisStore.setMessages(userId, messages);

  // 6. 分类：本轮有没有「新事实」，以及该进 user 还是 session
  const decision = await classifyTurn(content, reply);

  // 7. 长期/会话记忆回写：寒暄类决策会是双 false，这里什么都不写
  await mem0Memory.addMemory({
    writeUser: decision.write_user,
    writeSession: decision.write_session,
    messages: [
      { role: 'user', content },
      { role: 'assistant', content: reply },
    ],
  });

  return { reply, decision, ttl: await redisStore.getTtl(userId) };
};

const redisStore = new RedisStore(redis, {
  prefix: PREFIX,
  sessionId: SESSION_ID,
  ttlSeconds: TTL_SECONDS,
});
const mem0Memory = new Mem0Memory(mem0Client, USER_ID, SESSION_ID);
const rl = readline.createInterface({ input: stdin, output: stdout });

// 交互入口：每输入一句就走一遍完整记忆流水线
const main = async () => {
  try {
    while (true) {
      const content = (await rl.question('请输入问题: ')).trim();

      if (['exit', 'quit', ':q'].includes(content.toLowerCase())) {
        break;
      }

      if (!content) {
        continue;
      }

      const { reply, decision, ttl } = await invokeTurn({
        agentInstance: agent,
        redisStore,
        mem0Memory,
        userId: USER_ID,
        content,
      });

      console.log(reply);
      // 方便核对：本轮分层决策，以及 Redis key 还剩多久
      console.log(
        `\n[记忆决策] write_user=${decision.write_user} write_session=${decision.write_session} ttl=${ttl}\n${decision.reason}`,
      );
    }
  } finally {
    rl.close();
    await redis.quit();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
