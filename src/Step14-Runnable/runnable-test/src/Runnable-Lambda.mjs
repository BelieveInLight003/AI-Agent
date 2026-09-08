import 'dotenv/config';
import {
  RunnableSequence,
  RunnableLambda,
  RunnablePassthrough,
} from '@langchain/core/runnables';
import { ChatOpenAI } from '@langchain/openai';

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  apiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
});

const one = RunnableLambda.from((input) => {
  console.log('one', input);
  return input;
});

const two = RunnableLambda.from((input) => {
  console.log('two', input);
  return input * 2;
});

const three = RunnableLambda.from((input) => {
  console.log('three', input);
  return input * 3;
});

const runnables = RunnableSequence.from([one, two, three]);

const result = await runnables.invoke(5);

console.log(result);
