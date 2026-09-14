import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import {
  StateGraph,
  START,
  END,
  MessagesAnnotation,
} from '@langchain/langgraph';
import 'dotenv/config';
import { ToolNode, toolsCondition } from '@langchain/langgraph/prebuilt';
import { getProductBySku } from './inventory-mock.js';
import { z } from 'zod';

const getProductfromSku = tool(
  async ({ sku }) => {
    return getProductBySku(sku);
  },
  {
    name: 'getProductfromSku',
    description: 'Get a product from a SKU',
    // langchain tool() 用 schema，不是 parameters
    schema: z.object({
      sku: z.string().describe('商品 SKU，例如 SKU-001'),
    }),
  },
);

const llm = new ChatOpenAI({
  model: process.env.MODEL_NAME?.trim(),
  temperature: 0,
  apiKey: process.env.OPEN_API_KEY?.trim(),
  configuration: {
    // .env 里是 OPEN_BASE_URL，写成 OPEN_API_BASE_URL 会是 undefined
    // ChatOpenAI 就会打官方 api.openai.com，请求一直挂起
    baseURL: process.env.OPEN_BASE_URL?.trim(),
  },
}).bindTools([getProductfromSku]);

const toolNode = new ToolNode([getProductfromSku]);

const agent = async (state) => {
  const res = await llm.invoke(state.messages);
  return { messages: [res] };
};

const graph = new StateGraph(MessagesAnnotation)
  .addNode('agent', agent)
  .addNode('tools', toolNode)
  .addEdge(START, 'agent')
  .addConditionalEdges('agent', toolsCondition, ['tools', END])
  .addEdge('tools', 'agent')
  .compile();

const result = await graph.invoke({
  messages: [new HumanMessage('What is the product for SKU-001?')],
});

const last = result.messages[result.messages.length - 1];
console.log(last.content);
