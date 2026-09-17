import 'dotenv/config';
import { Redis } from 'ioredis';
import { ChatOpenAI } from '@langchain/openai';
import {
  mapChatMessagesToStoredMessages,
  mapStoredMessagesToChatMessages,
} from '@langchain/core/messages';
import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { summarizationMiddleware, createAgent, HumanMessage } from 'langchain';

const SESSION_ID = 'session_id';
const USER_ID = 'user';
const PREFIX = 'memory-agent';
const TTL_SECONDS = 60 * 60 * 24;

const model = new ChatOpenAI({
  model:
    process.env.MODEL?.trim() || process.env.MODEL_NAME?.trim() || 'qwen-plus',
  apiKey:
    process.env.OPEN_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim(),
  configuration: {
    baseURL:
      process.env.OPEN_BASE_URL?.trim() || process.env.OPENAI_BASE_URL?.trim(),
  },
});

const summaryPrompt = `你是对话摘要助手。请用中文总结以下对话，包含：

1. 讨论的主要话题
2. 用户提到的重要事实（姓名、偏好、日期等，务必保留原文信息）
3. 继续对话所需的关键上下文

保持简洁，不要编造，不要遗漏用户明确说过的信息。

待摘要的对话：
{messages}

摘要：`;

const agent = createAgent({
  systemPrompt:
    '假如你是一个信息助手，请根据用户的问题给出答案，并记住用户提供的关键信息。',
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

const redis = new Redis({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
  ...(process.env.REDIS_PASSWORD
    ? { password: process.env.REDIS_PASSWORD }
    : {}),
});

class RedisStore {
  constructor(client, { prefix, sessionId, ttlSeconds } = {}) {
    this.redis = client;
    this.prefix = prefix;
    this.sessionId = sessionId;
    this.ttlSeconds = ttlSeconds ?? TTL_SECONDS;
  }

  getMessageKey(userId) {
    return `${this.prefix}:${this.sessionId}:${userId}:messages`;
  }

  async getMessages(userId) {
    const raw = await this.redis.get(this.getMessageKey(userId));
    if (!raw) {
      return [];
    }

    return mapStoredMessagesToChatMessages(JSON.parse(raw));
  }

  async setMessages(userId, messages) {
    const payload = JSON.stringify(mapChatMessagesToStoredMessages(messages));
    await this.redis.set(
      this.getMessageKey(userId),
      payload,
      'EX',
      this.ttlSeconds,
    );
  }

  async clear(userId) {
    await this.redis.del(this.getMessageKey(userId));
  }

  async getSummary(userId) {
    const messages = await this.getMessages(userId);
    return messages;
  }
}

const store = new RedisStore(redis, {
  prefix: PREFIX,
  sessionId: SESSION_ID,
  ttlSeconds: TTL_SECONDS,
});
const rl = readline.createInterface({ input: stdin, output: stdout });

const invokeMessage = async (currentAgent, userId, content) => {
  const history = await store.getMessages(userId);
  const result = await currentAgent.invoke({
    messages: [...history, new HumanMessage(content)],
  });
  const messages = result.messages ?? [];
  await store.setMessages(userId, messages);
  return messages.at(-1);
};

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

      const result = await invokeMessage(agent, USER_ID, content);
      console.log(result?.content ?? '');

      const summary = await store.getSummary(USER_ID);
      if (summary) {
        console.log('\n[当前摘要]\n', summary);
      }
    }
  } finally {
    rl.close();
    await store.clear(USER_ID);
    await redis.quit();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
