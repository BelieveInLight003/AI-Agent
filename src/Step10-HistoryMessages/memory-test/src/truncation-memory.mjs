import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history';
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  trimMessages,
} from '@langchain/core/messages';
import path from 'node:path';
import { getEncoding } from 'js-tiktoken';

const encoding = getEncoding('cl100k_base');
const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
});

const truncationByCount = async () => {
  const history = new InMemoryChatMessageHistory();
  const maxMessages = 5;
  const messages = [
    { type: 'human', content: '我叫张三' },
    { type: 'ai', content: '你好张三，很高兴认识你！' },
    { type: 'human', content: '我今年25岁' },
    { type: 'ai', content: '25岁正是青春年华，有什么我可以帮助你的吗？' },
    { type: 'human', content: '我喜欢编程' },
    { type: 'ai', content: '编程很有趣！你主要用什么语言？' },
    { type: 'human', content: '我住在北京' },
    { type: 'ai', content: '北京是个很棒的城市！' },
    { type: 'human', content: '我的职业是软件工程师' },
    { type: 'ai', content: '软件工程师是个很有前景的职业！' },
  ];

  messages.forEach((message) => {
    if (message.type === 'human') {
      history.addMessage(new HumanMessage(message.content));
    } else {
      history.addMessage(new AIMessage(message.content));
    }
  });

  const allMessages = await history.getMessages();
  const truncatedMessages = allMessages.slice(-maxMessages);
  console.log('truncatedMessages: ', truncatedMessages);
  console.log('===============================================');
  console.log('allMessages length: ', allMessages.length);
  await history.clear();
  await history.addMessages(truncatedMessages);
  console.log('===============================================');
  console.log(
    'truncatedMessages length: ',
    (await history.getMessages()).length,
  );
  console.log('===============================================');
};

const getEncodingTokens = async (messages) => {
  let totalTokens = 0;
  messages.forEach((message) => {
    const content =
      typeof message.content === 'string'
        ? message.content
        : JSON.stringify(message.content);
    const tokens = encoding.encode(content);
    totalTokens += tokens.length;
  });
  return totalTokens;
};

const truncationByToken = async () => {
  const maxTokens = 100;
  const history = new InMemoryChatMessageHistory();

  const messages = [
    { type: 'human', content: '我叫张三' },
    { type: 'ai', content: '你好张三，很高兴认识你！' },
    { type: 'human', content: '我今年25岁' },
    { type: 'ai', content: '25岁正是青春年华，有什么我可以帮助你的吗？' },
    { type: 'human', content: '我喜欢编程' },
    { type: 'ai', content: '编程很有趣！你主要用什么语言？' },
    { type: 'human', content: '我住在北京' },
    { type: 'ai', content: '北京是个很棒的城市！' },
    { type: 'human', content: '我的职业是软件工程师' },
    { type: 'ai', content: '软件工程师是个很有前景的职业！' },
  ];

  messages.forEach((message) => {
    if (message.type === 'human') {
      history.addMessage(new HumanMessage(message.content));
    } else {
      history.addMessage(new AIMessage(message.content));
    }
  });

  const allMessages = await history.getMessages();
  const truncatedMessages = await trimMessages(allMessages, {
    maxTokens: maxTokens,
    tokenCounter: async (args) => await getEncodingTokens(args),
    strategy: 'last',
  });

  console.log('===============================================');
  console.log('truncatedMessages: ', truncatedMessages);
  console.log('===============================================');
  console.log('allMessages length: ', allMessages.length);
  console.log('===============================================');
  console.log('truncatedMessages length: ', truncatedMessages.length);
  console.log('===============================================');
};

const runAll = async () => {
  await truncationByCount();
  await truncationByToken();
};

runAll();
