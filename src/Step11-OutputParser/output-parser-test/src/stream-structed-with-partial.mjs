import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
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

const parser = StructuredOutputParser.fromZodSchema(schema);

const main = async () => {
  // 必须添加，通知大模型输出格式
  const systemPrompt = parser.getFormatInstructions();
  const response = await model.stream(`${question}\n\n${systemPrompt}`);
  let content = '';
  let outputCount = 0;
  for await (const chunk of response) {
    process.stdout.write(chunk.content);
    content += chunk.content;
    outputCount++;
  }
  const result = await parser.parse(content);
  console.log('outputCount: ', outputCount);
  console.log('最终结构化结果: ', result);
  console.log('outputCount: ', outputCount);
};

main();
