import dotenv from 'dotenv';
import { ChatOpenAI } from '@langchain/openai';

dotenv.config();

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL
  }
})

const response = await model.invoke('Introduce yourself');
console.log(response.content); 