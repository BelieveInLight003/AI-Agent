import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { Tool } from '@langchain/core/tools';
import { z } from 'zod';

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  temperature: 0,
  apiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
});

const question = `请介绍莫扎特`;

const schema = z.object({
  name: z.string().describe('姓名'),
  birth_year: z.number().describe('出生年份'),
  nationality: z.array(z.string()).describe('国籍数组'),
  major_achievements: z.array(z.string()).describe('主要成就数组'),
  famous_theory: z.array(z.string()).describe('著名理论数组'),
});

const modelWithTools = model.bindTools([
  {
    name: 'get_info',
    description: '获取莫扎特的信息',
    schema: schema,
  },
]);

const main = async () => {
  const response = await modelWithTools.stream(question);
  for await (const chunk of response) {
    if (chunk.tool_call_chunks && chunk.tool_call_chunks.length > 0) {
      process.stdout.write(chunk.tool_call_chunks[0].args);
    }
  }
};

main();
