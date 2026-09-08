import 'dotenv/config';
import { RouterRunnable, RunnableLambda } from '@langchain/core/runnables';

const upperCase = RunnableLambda.from((input) => {
  return input.toUpperCase();
});

const revertCase = RunnableLambda.from((input) => {
  // 字符串没有 reverse，需要先拆成数组
  return input.split('').reverse().join('');
});

// 正确类名是 RouterRunnable，用 new 而不是 .from
const runnables = new RouterRunnable({
  runnables: {
    upperCase,
    revertCase,
  },
});

const result = await runnables.invoke({
  key: 'upperCase',
  input: 'hello',
});
console.log(result);

const result2 = await runnables.invoke({
  key: 'revertCase',
  input: 'WORLD',
});
console.log(result2);
