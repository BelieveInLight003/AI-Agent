import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import {
  MessagesPlaceholder,
  ChatPromptTemplate,
  PromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from '@langchain/core/prompts';

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
});

const systemPrompt = SystemMessagePromptTemplate.fromTemplate(`
 你是一个助手，请根据用户的问题给出回答。你叫{name}，年龄{age}，性别{gender}
`);

const humanPrompt = HumanMessagePromptTemplate.fromTemplate(`
 我{input}，请帮我组织一段内容，用于介绍给相亲对象，我本人喜欢{hobby}，工作经历{work_experience}，旅行经历{travel_experience}。
`);

const chatPromptTemplate = ChatPromptTemplate.fromMessages([
  systemPrompt,
  new MessagesPlaceholder('history'),
  humanPrompt,
]);

const history = [
  {
    role: 'human',
    content: '你好，我是张三，我今年20岁，我是男生，我喜欢可爱，活泼的女生',
  },
  {
    role: 'ai',
    content: '你好，我是张三，我今年20岁，我是男生，我喜欢可爱，活泼的女生',
  },
  {
    role: 'human',
    content: '你好，我是李四，我今年21岁，我是女生，我喜欢打篮球',
  },
  {
    role: 'ai',
    content: '你好，我是李四，我今年21岁，我是女生，我喜欢打篮球',
  },
];

const prompt = await chatPromptTemplate.formatPromptValue({
  history: history,
  name: '张三',
  age: 20,
  gender: '男',
  input: '喜欢可爱，活泼的女生',
  hobby: '打篮球',
  work_experience: '腾讯，阿里',
  travel_experience: '北京，上海，广州，深圳',
  history: history,
});

const response = await model.invoke(prompt.toChatMessages());

console.log(response.content);
