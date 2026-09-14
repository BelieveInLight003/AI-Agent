import { createInterface } from 'node:readline/promises';
import {
  Annotation,
  StateGraph,
  START,
  END,
  interrupt,
  Command,
  MemorySaver,
} from '@langchain/langgraph';

const stateAnnotation = Annotation.Root({
  actionSummary: Annotation({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
  userInput: Annotation({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
});

const showTransform = () => ({
  actionSummary: '是否确认向章三转账1000元？',
});

const waitConfirm = (state) => {
  // interrupt：暂停图，把 payload 交给外面；resume 时 interrupt() 的返回值就是用户输入
  const text = interrupt({
    hint: '请输入确认或取消',
    actionSummary: state.actionSummary,
  });
  return {
    userInput: String(text),
  };
};

const graph = new StateGraph(stateAnnotation)
  .addNode('showTransform', showTransform)
  .addNode('waitConfirm', waitConfirm)
  .addEdge(START, 'showTransform')
  .addEdge('showTransform', 'waitConfirm')
  .addEdge('waitConfirm', END)
  .compile({
    checkpointer: new MemorySaver(),
  });

const config = {
  configurable: {
    thread_id: 'user-interrupt',
  },
};

const pausedState = await graph.invoke({}, config);
console.log(pausedState);

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const line = (await rl.question('> ')).trim();

const res = await graph.invoke(new Command({ resume: line }), config);
console.log(res);

rl.close();
