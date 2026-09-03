import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history';
import {
  HumanMessage,
  AIMessage,
  trimMessages,
  getBufferString,
} from '@langchain/core/messages';
import { getEncoding } from 'js-tiktoken';

const encoding = getEncoding('cl100k_base');

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
});

const memory = new InMemoryChatMessageHistory();

// 计算token
const countTokens = (message) => {
  console.log('message: ', message.content);
  const content =
    typeof message.content === 'string'
      ? message.content
      : JSON.stringify(message.content);
  const tokens = encoding.encode(content);
  return tokens.length;
};

const truntionFunction = async () => {
  const maxLength = 2;
  const history = new InMemoryChatMessageHistory();
  const maxToken = 100;

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

  const recentMessages = [];
  let recentTokens = 0;
  for (const message of allMessages) {
    const tokens = countTokens(message);

    if (recentTokens + tokens <= maxToken) {
      recentMessages.unshift(message);
      recentTokens += tokens;
    } else {
      break;
    }
  }

  const summaryMessages = allMessages.slice(
    0,
    allMessages.length - recentMessages.length,
  );
  const summaryText = getBufferString(summaryMessages, {
    humanPrefix: '用户',
    aiPrefix: '助手',
  });

  const prompt = `请根据以下对话内容，总结出对话的中心思想：
  ${summaryText}
  `;
  const response = await model.invoke(prompt);
  console.log('response: ', response.content);
  console.log('===============================================');
  console.log('summaryMessages: ', summaryMessages.length);
  console.log('===============================================');
  console.log('recentMessages: ', recentMessages.length);
  console.log('===============================================');
  console.log('recentMessages: ', recentMessages);
};

truntionFunction();
