import 'dotenv/config';
import {
  RunnablePassthrough,
  RunnableSequence,
} from '@langchain/core/runnables';

const runnables = RunnableSequence.from([
  // 第 1 步：把字符串包成对象
  (input) => ({
    concept: input,
  }),
  // 第 2 步：对象字面量会变成并行 Map
  {
    // Passthrough：原样透传上一步结果 { concept: 'hello' }
    original: new RunnablePassthrough(),
    // 这里参数是上一步的输出对象，不是外层的 input
    processed: (obj) => ({
      concept: obj.concept,
      upper: obj.concept.toUpperCase(),
      lower: obj.concept.toLowerCase(),
      reversed: obj.concept.split('').reverse().join(''),
    }),
  },
]);

const result = await runnables.invoke('hello');
console.log(result);
