import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { createSupervisor } from '@langchain/langgraph-supervisor';
import { createAgent } from 'langchain';
import { lookupWeather, lookupCityTrivia } from './simple-mock.mjs';
import { createSupervisor } from '@langchain/langgraph-supervisor';

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME?.trim(),
  temperature: 0,
  apiKey: process.env.OPEN_API_KEY?.trim(),
  configuration: {
    baseURL: process.env.OPEN_BASE_URL?.trim(),
  },
});

const toolWeather = tool(async ({ city }) => lookupWeather(city), {
  name: 'weather_search',
  description: 'Search for the weather of a city',
  schema: z.object({
    city: z.string().describe('The city to search for the weather'),
  }),
});

const toolCity = tool(async ({ city }) => lookupCityTrivia(city), {
  name: 'city_search',
  description: 'Search for trivia about a city',
  schema: z.object({
    city: z.string().describe('The city to search for'),
  }),
});

const agentWeather = createAgent({
  name: 'weather_expert',
  model,
  tools: [toolWeather],
  systemPrompt:
    'You are a helpful assistant that can answer questions and help with tasks. 使用工具查询天气，不要胡编乱造',
});

const agentCity = createAgent({
  name: 'city_expert',
  model,
  tools: [toolCity],
  systemPrompt:
    'You are a helpful assistant that can answer questions and help with tasks. 使用工具查询城市，不要胡编乱造',
});

const workflow = createSupervisor({
  llm: model,
  agents: [agentWeather, agentCity],
  prompt:
    'You are a helpful assistant that can answer questions and help with tasks. 使用工具查询天气和城市，不要胡编乱造',
});

const app = workflow.compile();

const result = await app.invoke({
  messages: [new HumanMessage('What is the weather in Tokyo?')],
});

console.log(result);
