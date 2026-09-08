import 'dotenv/config';
import {
  RunnablePick,
  RunnableLambda,
  RunnableSequence,
} from '@langchain/core/runnables';

const runnables = RunnableSequence.from([
  (input) => ({
    ...input,
    fullInfo: `${input.name} is ${input.age} years old.`,
  }),
  new RunnablePick(['name', 'fullInfo']),
]);

const data = {
  name: 'John',
  age: 30,
  city: 'New York',
  country: 'USA',
  email: 'john@example.com',
  phone: '1234567890',
  address: '123 Main St, Anytown, USA',
  zip: '12345',
  state: 'NY',
};

const result = await runnables.invoke(data);
console.log(result);
