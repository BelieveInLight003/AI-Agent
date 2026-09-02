import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  temperature: 0,
  apiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
});

const schema = z.object({
  name: z.string().describe('姓名'),
  birth_year: z.number().describe('出生年份'),
  nationality: z.array(z.string()).describe('国籍数组'),
  major_achievements: z.array(z.string()).describe('主要成就数组'),
  famous_theory: z.array(z.string()).describe('著名理论数组'),
});

// 使用方法
const structuredOutputModel = model.withStructuredOutput(schema);

const question = `请介绍爱因斯坦`;

// 返回的结果直接是 json  不存在content
try {
  const response = await structuredOutputModel.invoke(question);
  console.log(`以JSON格式输出： `);
  console.log(response);
  console.log(`name: ${response.name}`);
  console.log(`birth_year: ${response.birth_year}`);
  console.log(`nationality: ${response.nationality}`);
  console.log(`major_achievements: ${response.major_achievements}`);
  console.log(`famous_theory: ${response.famous_theory}`);
} catch (error) {
  console.error(error);
}
