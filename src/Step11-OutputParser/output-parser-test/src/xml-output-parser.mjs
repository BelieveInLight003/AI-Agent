import 'dotenv/config';
import { XMLOutputParser } from '@langchain/core/output_parsers';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  temperature: 0,
  apiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
});

const parser = new XMLOutputParser();

const question = `请提取以下文本中人物的有效信息，爱因斯坦出生于1987，是一名物理学家,${parser.getFormatInstructions()}`;

try {
  const response = await model.invoke(question);
  // 输出xml文本
  console.log('response', response.content);
  // 输出json对象
  const result = await parser.parse(response.content);
  console.log('parser', result);
} catch (error) {
  console.error(error);
}
