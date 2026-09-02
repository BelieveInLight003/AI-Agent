import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { JsonOutputParser } from '@langchain/core/output_parsers';

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  temperature: 0,
  apiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
});

const parser = new JsonOutputParser();

const question = `请介绍爱因斯坦，并以 JSON 格式输出，包含以下字段：name（姓名）、birth_year（出生年份）、nationality（国籍数组）、major_achievements（主要成就数组）、famous_theory（著名理论数组）。
  ${parser.getFormatInstructions()}`;

try {
  const response = await model.invoke(question);
  const result = await parser.parse(response.content);
  console.log(response.content);
  console.log(`以JSON格式输出： `);
  console.log(result);
  console.log(`name: ${result.name}`);
  console.log(`birth_year: ${result.birth_year}`);
  console.log(`nationality: ${result.nationality}`);
  console.log(`major_achievements: ${result.major_achievements}`);
  console.log(`famous_theory: ${result.famous_theory}`);
} catch (error) {
  console.error(error);
}
