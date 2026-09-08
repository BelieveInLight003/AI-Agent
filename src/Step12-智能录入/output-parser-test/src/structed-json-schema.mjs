import 'dotenv/config';
import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import chalk from 'chalk';
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from '@langchain/core/messages';

const schema = z.object({
  name: z.string().describe('姓名'),
  gender: z.string().nullable().describe('性别，男或女'),
  birthDate: z.string().nullable().describe('出生日期，格式 YYYY-MM-DD'),
  company: z.string().nullable().describe('公司'),
  title: z.string().nullable().describe('职位'),
  phone: z.string().nullable().describe('手机号'),
  wechat: z.string().nullable().describe('微信号'),
});

const jsonSchema = zodToJsonSchema(schema);

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
  temperature: 0,
  timeout: 30000,
  maxRetries: 1,
  modelKwargs: {
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'user_info',
        schema: jsonSchema,
        strict: true,
      },
    },
  },
});

const systemMessage = new SystemMessage(
  '你是一个数据分析师，请根据用户的需求，分析数据并返回JSON数据',
);
const humanMessage = new HumanMessage(`请帮我介绍一下，马化腾的个人信息`);

try {
  console.log('正在调用模型...');
  const result = await model.invoke([systemMessage, humanMessage]);
  const resultSchema = JSON.parse(result.content);
  console.log('resultSchema: ', resultSchema);
} catch (error) {
  console.error('调用失败: ', error);
}
