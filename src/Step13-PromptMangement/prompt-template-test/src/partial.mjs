import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import {
  PromptTemplate,
  PipelinePromptTemplate,
} from '@langchain/core/prompts';
import { promptTemplate } from './pipe-prompt-template2.mjs';

const partialPrompt = await promptTemplate.partial({
  work_experience: '腾讯，阿里',
  travel_experience: '北京，上海，广州，深圳',
});

const prompt1 = await partialPrompt.format({
  name: '张三',
  age: 20,
  gender: '男',
  hobby: '打篮球',
});

const prompt2 = await partialPrompt.format({
  name: '李四',
  age: 21,
  gender: '女',
  hobby: '打羽毛球',
});

console.log(prompt1);
console.log(prompt2);
