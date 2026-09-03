import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { JsonOutputToolsParser } from '@langchain/core/output_parsers/openai_tools';
import { z } from 'zod';

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
  temperature: 0,
});

const question = `请介绍莫扎特`;

const schema = z.object({
  name: z.string().describe('姓名'),
  birth_year: z.number().describe('出生年份'),
  nationality: z.array(z.string()).describe('国籍数组'),
  major_achievements: z.array(z.string()).describe('主要成就数组'),
  famous_theory: z.array(z.string()).describe('著名理论数组'),
});

const toolModel = model.bindTools([
  {
    name: 'get_mozart_info',
    description: '获取莫扎特的信息',
    schema: schema,
  },
]);

const parser = new JsonOutputToolsParser();
const chain = toolModel.pipe(parser);

try {
  const response = await chain.stream(question);
  for await (const chunk of response) {
    if (chunk.length > 0) {
      console.log('chunk[0].args', chunk[0].args);
    }
  }
} catch (error) {
  console.error(error);
}

// 在每个节点，就算返回的不完整，输出也是完整拼接的内容
