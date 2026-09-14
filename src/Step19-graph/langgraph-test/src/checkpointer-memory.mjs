import {
  Annotation,
  StateGraph,
  START,
  END,
  MemorySaver,
} from '@langchain/langgraph';

const stateAnnotation = Annotation.Root({
  count: Annotation({
    reducer: (_prev, next) => next,
    default: () => 0,
  }),
  message: Annotation({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
});

const recordNode = (state) => {
  const count = state.count + 1;
  if (count === 1) {
    return {
      count,
      message: 'This is the first time you are running this node.',
    };
  }
  return {
    count,
    message: `This is the ${count}th time you are running this node.`,
  };
};

const graph = new StateGraph(stateAnnotation)
  .addNode('record', recordNode)
  .addEdge(START, 'record')
  .addEdge('record', END);

const memorySaver = new MemorySaver();

const app = graph.compile({
  checkpointer: memorySaver,
});

// checkpointer 按 thread_id 区分会话。同一 id 会读上次的 state（count 会累加）
const user1 = { configurable: { thread_id: 'user1-wang' } };
const user2 = { configurable: { thread_id: 'user-zhan' } };

// invoke 第一个参数是图的输入（state），第二个才是 RunnableConfig
// 之前写成 invoke(user1)：config 被当成 state，而且拼成了 confgrable / name，
// MemorySaver 找不到 thread_id 就会抛错，四个 console.log 都走不到
const res1 = await app.invoke({}, user1);
const res2 = await app.invoke({}, user2);
const res3 = await app.invoke({}, user1);
const res4 = await app.invoke({}, user1);

console.log(res1);
console.log(res2);
console.log(res3);
console.log(res4);
