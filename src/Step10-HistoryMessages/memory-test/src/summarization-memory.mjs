import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history';
import {
  HumanMessage,
  AIMessage,
  trimMessages,
  getBufferString,
} from '@langchain/core/messages';

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
});

const truntionFunction = async () => {
  const maxLength = 2;
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
  const truncatedMessages = allMessages.slice(-maxLength);
  console.log('truncatedMessages: ', truncatedMessages);
  console.log('===============================================');
  console.log('allMessages length: ', allMessages.length);
  console.log('===============================================');
  const summaryMessages = allMessages.slice(0, -maxLength);
  console.log('summaryMessages: ', summaryMessages);
  console.log('===============================================');
  await history.clear();
  await history.addMessages(truncatedMessages);

  // getBufferString 增加前缀
  const convertText = getBufferString(summaryMessages, {
    humanPrefix: '用户',
    aiPrefix: '助手',
  });
  const prompt = `请根据以下对话内容，总结出对话的中心思想：
  ${convertText}
  `;
  const response = await model.invoke(prompt);
  console.log('response: ', response.content);
  console.log('===============================================');
};

truntionFunction();
