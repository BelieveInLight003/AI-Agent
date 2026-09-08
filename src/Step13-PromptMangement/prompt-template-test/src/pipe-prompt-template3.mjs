import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import {
  PromptTemplate,
  PipelinePromptTemplate,
  ChatPromptTemplate,
} from '@langchain/core/prompts';
import { promptTemplate } from './pipe-prompt-template2.mjs';

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
});

const systemPrompt = PromptTemplate.fromTemplate(`
 你是一个助手，请根据用户的问题给出回答。你叫{name}，年龄{age}，性别{gender}
`);

const systemPrompt2 = PromptTemplate.fromTemplate(`
  喜欢明星{star}，喜欢电影{movie}，喜欢音乐{music}
 `);

const humanPrompt = PromptTemplate.fromTemplate(`
 我{input}，请帮我组织一段内容，用于介绍给相亲对象，我本人喜欢{hobby}，工作经历{work_experience}，旅行经历{travel_experience}。
`);

const finalPrompt = ChatPromptTemplate.fromMessages([
  ['system', `{systemPrompt}，{systemPrompt2}`],
  ['human', `{humanPrompt}`],
]);

// chat prompt template
const prompt = await new PipelinePromptTemplate({
  pipelinePrompts: [
    {
      name: 'systemPrompt',
      prompt: systemPrompt,
    },
    {
      name: 'systemPrompt2',
      prompt: systemPrompt2,
    },
    {
      name: 'humanPrompt',
      prompt: humanPrompt,
    },
  ],
  finalPrompt: finalPrompt,
  inputVariables: [
    'name',
    'age',
    'gender',
    'input',
    'hobby',
    'work_experience',
    'travel_experience',
    'star',
    'movie',
    'music',
  ],
});

const response = await prompt.formatPromptValue({
  name: '张三',
  age: 20,
  gender: '男',
  input: '喜欢可爱，活泼的女生',
  hobby: '打篮球',
  work_experience: '腾讯，阿里',
  travel_experience: '北京，上海，广州，深圳',
});

console.log(response.toChatMessages());
