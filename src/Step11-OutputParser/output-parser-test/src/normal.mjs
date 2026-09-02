import { ChatOpenAI } from '@langchain/openai';
import 'dotenv/config';
import { config } from 'dotenv';

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  temperature: 0,
  apiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
});

const question =
  '请介绍爱因斯坦，并以 JSON 格式输出，包含以下字段：name（姓名）、birth_year（出生年份）、nationality（国籍数组）、major_achievements（主要成就数组）、famous_theory（著名理论数组）。';

try {
  const response = await model.invoke(question);
  console.log(response.content);
  console.log(`以JSON格式输出： ${JSON.parse(response.content)}`);
} catch (error) {
  console.error(error);
}
