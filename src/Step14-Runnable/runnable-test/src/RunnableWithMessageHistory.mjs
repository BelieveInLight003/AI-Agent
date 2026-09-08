import 'dotenv/config';
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history';
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatOpenAI } from '@langchain/openai';

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  apiKey: process.env.OPEN_API_KEY,
  temperature: 0,
  configuration: {
    // .env 里是 OPEN_BASE_URL
    baseURL: process.env.OPEN_BASE_URL,
  },
});

const prompt = ChatPromptTemplate.fromMessages([
  ['system', '你是一个人工助手，可以帮助用户用一两句话，来回答对方的问题。'],
  new MessagesPlaceholder('history'),
  ['human', '{input}'],
]);

const outputParser = new StringOutputParser();

// 顺序必须是：prompt -> model -> parser
const simpleChain = prompt.pipe(model).pipe(outputParser);

// 按 sessionId 缓存各自的历史
const store = new Map();

const getMessageHistory = async (sessionId) => {
  if (!store.has(sessionId)) {
    store.set(sessionId, new InMemoryChatMessageHistory());
  }
  return store.get(sessionId);
};

const chain = new RunnableWithMessageHistory({
  runnable: simpleChain,
  getMessageHistory, // 注意字段名
  inputMessagesKey: 'input',
  historyMessagesKey: 'history',
});

const sessionId = '123';

// configurable 是 invoke 的第 2 个参数，不要塞进 input
const result = await chain.invoke(
  { input: '你好，我是小明' },
  { configurable: { sessionId } },
);
console.log(result);

const result2 = await chain.invoke(
  { input: '我喜欢旅行' },
  { configurable: { sessionId } },
);
console.log(result2);

const result3 = await chain.invoke(
  { input: '我喜欢爬山' },
  { configurable: { sessionId } },
);
console.log(result3);
