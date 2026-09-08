import { ChatOpenAI } from '@langchain/openai';
import {
  PipelinePromptTemplate,
  PromptTemplate,
} from '@langchain/core/prompts';
import 'dotenv/config';

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
});

export const personInfoPrompt = PromptTemplate.fromTemplate(`
  姓名： {name}
  年龄： {age}
  性别： {gender}
`);

export const hobbyPrompt = PromptTemplate.fromTemplate(`
  兴趣爱好： {hobby}
`);

const workPrompt = PromptTemplate.fromTemplate(`
  工作经历： {work_experience}
`);

const finalPrompt = PromptTemplate.fromTemplate(`
  {user}
  {hobby}
  {work}
  请根据以上信息，帮我组织一段内容，用于介绍某人。
`);

const promptTemplate = new PipelinePromptTemplate({
  pipelinePrompts: [
    {
      // 这里的name对应finalPrompt中的{user}、{hobby}、{work}
      name: 'user',
      prompt: personInfoPrompt,
    },
    {
      name: 'hobby',
      prompt: hobbyPrompt,
    },
    {
      name: 'work',
      prompt: workPrompt,
    },
  ],
  finalPrompt: finalPrompt,
  inputVariables: ['name', 'age', 'gender', 'hobby', 'work_experience'],
});

const prompt = await promptTemplate.format({
  name: '张三',
  age: 20,
  gender: '男',
  hobby: '打篮球',
  work_experience: '工作经历',
});

console.log(prompt);
