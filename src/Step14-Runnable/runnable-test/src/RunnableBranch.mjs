import 'dotenv/config';
import { RunnableBranch, RunnableLambda } from '@langchain/core/runnables';

const isPositive = (input) => input > 0;
const isNegative = (input) => input < 0;

const positive = RunnableLambda.from((input) => {
  console.log('positive', input);
  return `数字 ${input} 是正数`;
});

const negative = RunnableLambda.from((input) => {
  console.log('negative', input);
  return `数字 ${input} 是负数`;
});

const zero = RunnableLambda.from((input) => {
  console.log('zero', input);
  return `数字 ${input} 是零`;
});

// 前面是 [条件, 分支]，最后一项是默认分支（不能再包条件）
const runnables = RunnableBranch.from([
  [isPositive, positive],
  [isNegative, negative],
  zero, // 默认分支：前面都不匹配时走这里（包括 0）
]);

const result1 = await runnables.invoke(0);
console.log(result1);

const result2 = await runnables.invoke(-1);
console.log(result2);

const result3 = await runnables.invoke(1);
console.log(result3);
