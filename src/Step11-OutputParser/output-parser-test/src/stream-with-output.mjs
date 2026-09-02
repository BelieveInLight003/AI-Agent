import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
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

const schemaModel = model.withStructuredOutput(schema);

try {
  const response = await schemaModel.stream(question);
  let result = '';
  let outputCount = 0;
  for await (const chunk of response) {
    outputCount++;
    console.log('chunk: ', chunk);
    result = chunk;
  }
  // 最终结构化结果
  console.log('最终结构化结果: ', result);
  console.log('outputCount: ', outputCount);
} catch (error) {
  console.error(error);
}

// outputCount 返回一个完整的json 非流式
