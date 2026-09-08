import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import {
  PromptTemplate,
  FewShotPromptTemplate,
} from '@langchain/core/prompts';

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
});

const examples = [
  {
    input: '你好，我是张三，我今年20岁，我是男生，我喜欢可爱，活泼的女生',
    output: '张三，20岁，男，喜欢可爱活泼的女生',
  },
  {
    input: '你好，我是李四，我今年21岁，我是女生，我喜欢打篮球',
    output: '李四，21岁，女，喜欢打篮球',
  },
];

// examplePrompt 只使用 examples 里的字段
const examplePrompt = PromptTemplate.fromTemplate(`
输入: {input}
输出: {output}
`);

const fewShotPromptTemplate = new FewShotPromptTemplate({
  examples,
  examplePrompt,
  // 运行时变量放在 prefix / suffix
  prefix: '你是一个自我介绍助手。当前场景：{scene}',
  suffix: '请根据下面信息生成介绍：{user_input}',
  inputVariables: ['scene', 'user_input'],
});

const prompt = await fewShotPromptTemplate.format({
  scene: '相亲',
  user_input: '你好，我是王五，我今年22岁，我是男生，我喜欢看书',
});

console.log('prompt:', prompt);

const response = await model.invoke(prompt);
console.log('response:', response.content);
