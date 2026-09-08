import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import {
  PipelinePromptTemplate,
  PromptTemplate,
} from '@langchain/core/prompts';
import { personInfoPrompt, hobbyPrompt } from './pipe-prompt-template.mjs';

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
});

const workPrompt = PromptTemplate.fromTemplate(`
  工作经历： {work_experience}
`);

const travelPrompt = PromptTemplate.fromTemplate(`
  旅行经历： {travel_experience}
`);

export const promptTemplate = new PipelinePromptTemplate({
  pipelinePrompts: [
    {
      name: 'personTemplate',
      prompt: personInfoPrompt,
    },
    {
      name: 'hobbyTemplate',
      prompt: hobbyPrompt,
    },
    {
      name: 'workTemplate',
      prompt: workPrompt,
    },
    {
      name: 'travelTemplate',
      prompt: travelPrompt,
    },
  ],
  finalPrompt: PromptTemplate.fromTemplate(`
    {personTemplate}
    {hobbyTemplate}
    {workTemplate}
    {travelTemplate}
    请根据以上信息，帮我组织一段内容，用于介绍某人。
  `),
  inputVariables: [
    'name',
    'age',
    'gender',
    'hobby',
    'work_experience',
    'travel_experience',
  ],
});

const prompt = await promptTemplate.format({
  name: '张三',
  age: 20,
  gender: '男',
  hobby: '打篮球',
  work_experience: '腾讯，阿里',
  travel_experience: '北京，上海，广州，深圳',
});

console.log(prompt);
