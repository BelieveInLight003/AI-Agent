// 使用LCEL的方式，将前面的demo改写
import {
  RunnableSequence,
  RunnableLambda,
  RunnablePassthrough,
  RunnableBranch,
} from '@langchain/core/runnables';
import { ChatOpenAI } from '@langchain/openai';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { HumanMessage, ToolMessage } from '@langchain/core/messages';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';

dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env'),
});

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  apiKey: process.env.OPEN_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
});

const mcp = new MultiServerMCPClient({
  'amap-maps-streamableHTTP': {
    url: `https://mcp.amap.com/mcp?key=${process.env.AMAP_API_KEY}`,
  },
  'chrome-devtools': {
    command: '/Users/balala/.nvm/versions/node/v22.23.2/bin/npx',
    args: ['-y', 'chrome-devtools-mcp@latest'],
  },
});
const tools = await mcp.getTools();
const modelWithTools = model.bindTools(tools);

const prompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    '你是一个能使用工具的助手。用户要求打开浏览器时，必须在查到酒店后继续调用 chrome-devtools 工具：为每个酒店打开一个标签页并访问其网页，再用 evaluate_script 把 document.title 改成酒店名称。在所有浏览器操作完成之前，不要只返回酒店文字信息。',
  ],
  new MessagesPlaceholder('messages'),
]);

// 不要接 StringOutputParser：否则 AIMessage 会变成纯字符串，tool_calls 丢失
const llmChain = prompt.pipe(modelWithTools);

const toolExecutor = RunnableLambda.from(async (state) => {
  const toolCalls = state.response.tool_calls ?? [];
  const toolMessages = [];

  console.log(
    `调用 ${toolCalls.length} 个工具: ${toolCalls.map((t) => t.name).join(', ')}`,
  );

  for (const toolCall of toolCalls) {
    const foundTool = tools.find((tool) => tool.name === toolCall.name);
    if (!foundTool) {
      throw new Error(`Tool ${toolCall.name} not found`);
    }

    const toolResult = await foundTool.invoke(toolCall.args);
    const content =
      typeof toolResult === 'string'
        ? toolResult
        : (toolResult?.text ?? JSON.stringify(toolResult));

    toolMessages.push(
      new ToolMessage({
        content,
        tool_call_id: toolCall.id,
      }),
    );
  }

  return {
    ...state,
    done: false,
    messages: [...state.messages, state.response, ...toolMessages],
  };
});

const finishWithoutTools = RunnableLambda.from(async (state) => {
  return {
    ...state,
    done: true,
    messages: [...state.messages, state.response],
  };
});

const runAgentWithTools = RunnableSequence.from([
  RunnablePassthrough.assign({
    response: llmChain,
  }),
  RunnableBranch.from([
    [
      (state) =>
        !state.response.tool_calls || state.response.tool_calls.length === 0,
      finishWithoutTools,
    ],
    toolExecutor,
  ]),
]);

const main = async (query, maxLength = 30) => {
  let state = {
    messages: [new HumanMessage(query)],
    done: false,
  };

  for (let i = 0; i < maxLength; i++) {
    console.log(`第 ${i + 1} 轮`);
    const result = await runAgentWithTools.invoke(state);
    state = result;
    if (state.done) {
      break;
    }
  }

  const last = state.messages[state.messages.length - 1];
  return last.content;
};

const result = await main(
  '你好，帮我找到北京南站附近的5个酒店，并在浏览器打开酒店的图片，同时标签页显示对应酒店的名称',
  30,
);
console.log(result);
await mcp.close();
