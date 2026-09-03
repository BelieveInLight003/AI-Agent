import 'dotenv/config';
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history';
import { ChatOpenAI } from '@langchain/openai';
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from '@langchain/core/messages';

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  temperature: 0,
  apiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
});

const history = new InMemoryChatMessageHistory();

const main = async () => {
  console.log('1th Talk with the model: ');
  const systemMessage = new SystemMessage('You are a helpful assistant.');

  const humanMessage1 = new HumanMessage('Hello, how are you?');
  console.log('存储human message');
  await history.addMessage(humanMessage1);
  const responseMessage1 = await model.invoke([systemMessage, humanMessage1]);
  console.log('存储response message', responseMessage1.content);
  await history.addMessage(responseMessage1);

  console.log('2th Talk with the model: ');
  const humanMessage2 = new HumanMessage('What is the weather in Tokyo?');
  console.log('存储human message');
  await history.addMessage(humanMessage2);
  const previousMessages = await history.getMessages();
  const responseMessage2 = await model.invoke([
    systemMessage,
    ...previousMessages,
  ]);
  console.log('存储response message', responseMessage2.content);
  await history.addMessage(responseMessage2);

  // 打印history
  const allMessages = await history.getMessages();
  allMessages.forEach((message) => {
    const type = message.type === 'human' ? 'Human' : 'AI';
    console.log(`${type}: ${message.content}`);
  });
};

main();
