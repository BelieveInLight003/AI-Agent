import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import 'dotenv/config';
import { getProductBySku } from './inventory-mock.js';
import { z } from 'zod';
import { createAgent } from 'langchain';
import { MemorySaver } from '@langchain/langgraph';

const getProductfromSku = tool(
  async ({ sku }) => {
    return getProductBySku(sku);
  },
  {
    name: 'getProductfromSku',
    description: 'Get a product from a SKU',
    schema: z.object({
      sku: z.string().describe('商品 SKU，例如 SKU-001'),
    }),
  },
);

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME?.trim(),
  temperature: 0,
  apiKey: process.env.OPEN_API_KEY?.trim(),
  configuration: {
    baseURL: process.env.OPEN_BASE_URL?.trim(),
  },
});

const agent = createAgent({
  // langchain 1.x 的 createAgent 必填字段是 model，不是 llm
  model,
  tools: [getProductfromSku],
  systemPrompt:
    'You are a helpful assistant that can answer questions and help with tasks. 使用工具查询库存，不要胡编乱造',
  checkpointer: new MemorySaver(),
});

// createAgent 已经返回可 invoke 的 agent，不要再 invoke 已注释掉的 graph
// 第一个参数是输入，第二个才是 config（thread_id 给 checkpointer 用）
const result = await agent.invoke(
  {
    messages: [new HumanMessage('What is the product for SKU-001?')],
  },
  {
    configurable: {
      thread_id: '123',
    },
  },
);

const last = result.messages[result.messages.length - 1];
console.log(last.content);
