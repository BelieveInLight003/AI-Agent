import 'dotenv/config';
import { RunnableMap, RunnableLambda } from '@langchain/core/runnables';
import { PromptTemplate } from '@langchain/core/prompts';

const one = RunnableLambda.from((input) => {
  console.log('one', input);
  return input;
});

const two = RunnableLambda.from((input) => {
  console.log('two', input);
  return input * 2;
});

const prompt1 = PromptTemplate.fromTemplate('Hello, {name}! How are you?');
const prompt2 = PromptTemplate.fromTemplate(`{name} is {age} years old.`);

const runnables = RunnableMap.from({
  one,
  two,
  prompt1: prompt1.pipe(one),
  prompt2: prompt2.pipe(two),
});

const result = await runnables.invoke({
  name: 'John',
  age: 30,
});

console.log(result);
