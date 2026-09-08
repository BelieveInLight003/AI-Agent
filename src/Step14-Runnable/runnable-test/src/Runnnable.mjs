import 'dotenv/config';
import { RunnableSequence } from '@langchain/core/runnables';
import { ChatOpenAI } from '@langchain/openai';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';
import { PromptTemplate } from '@langchain/core/prompts';

const schema = z.object({
  name: z.string().describe('用户姓名'),
  age: z.number().describe('用户年龄'),
  email: z.string().email().describe('用户邮箱'),
});

const parser = StructuredOutputParser.fromZodSchema(schema);

const prompt = PromptTemplate.fromTemplate(`
你是一个助手，请根据下面的用户信息，整理成结构化 JSON 数据。
必须严格使用英文键名：name、age、email。不要使用中文键名。

用户信息：
姓名：{name}
年龄：{age}
邮箱：{email}

{format_instructions}
`);

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  apiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
});

const runnables = RunnableSequence.from([prompt, model, parser]);

console.log('正在调用模型...');

const result = await runnables.invoke({
  name: 'John Doe',
  age: 30,
  email: 'john.doe@example.com',
  // 莫忘，需要将 format_instructions 传给模型。
  format_instructions: parser.getFormatInstructions(),
});

console.log(result);
