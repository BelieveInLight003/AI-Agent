import 'dotenv/config';
import {
  RunnableEach,
  RunnableLambda,
  RunnableSequence,
} from '@langchain/core/runnables';

const greet = RunnableLambda.from((input) => input.toUpperCase());
const ask = RunnableLambda.from((input) => `How are you, ${input}?`);

const processItem = RunnableSequence.from([greet, ask]);

const chain = new RunnableEach({
  bound: processItem,
});

const result = await chain.invoke(['John', 'Jane']);
console.log(result);
