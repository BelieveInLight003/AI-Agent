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

const restoredHistory = new FileSystemChatMessageHistory({
  filePath: path.join(process.cwd(), '/src/history_messages.json'),
  sessionId: '1',
});

const addMessageToHistory = async () => {
  const allMessages = await restoredHistory.getMessages();
  allMessages.forEach((message) => {
    console.log(`${message.type} \n content: ${message.content}`);
  });

  const question = '晚上吃什么';
  const humanMessage = new HumanMessage(question);
  await restoredHistory.addMessage(humanMessage);

  const response = await model.invoke([humanMessage, ...allMessages]);
  await restoredHistory.addMessage(response);

  const newAllMessages = await restoredHistory.getMessages();
  console.log('===============================================');
  newAllMessages.forEach((message) => {
    console.log(`${message.type} \n content: ${message.content}`);
    console.log('===============================================');
  });
};

addMessageToHistory();
