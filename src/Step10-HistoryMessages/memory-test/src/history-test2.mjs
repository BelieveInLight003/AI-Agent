import 'dotenv/config';
import { FileSystemChatMessageHistory } from '@langchain/community/stores/message/file_system';
import { ChatOpenAI } from '@langchain/openai';
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from '@langchain/core/messages';
import path from 'node:path';

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
});

const history = new FileSystemChatMessageHistory({
  filePath: path.join(process.cwd(), '/src/history_messages.json'),
  sessionId: '1',
});

const addMessageToHistory = async () => {
  const systemMessage = new SystemMessage(
    'You are a helpful person who can answer questions about food.',
  );

  // 第一轮对话
  const question1 = '早上吃什么';
  const humanMessage = new HumanMessage(question1);

  await history.addMessage(humanMessage);

  const response = await model.invoke([systemMessage, humanMessage]);
  await history.addMessage(response);

  // 第二轮对话
  const question2 = '中午吃什么';
  const humanMessage2 = new HumanMessage(question2);
  await history.addMessage(humanMessage2);

  const messagesPrevious = await history.getMessages();
  const response2 = await model.invoke([systemMessage, ...messagesPrevious]);
  await history.addMessage(response2);

  const allMessages = await history.getMessages();
  console.log('All messages: ', allMessages);
};

addMessageToHistory();
