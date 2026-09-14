import { Annotation, StateGraph, START, END } from '@langchain/langgraph';

const stateAnnotation = Annotation.Root({
  tries: Annotation({
    reducer: (_prev, next) => next,
    default: () => 0,
  }),
  ok: Annotation({
    reducer: (_prev, next) => next,
    default: () => false,
  }),
  message: Annotation({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
});

const tryNode = (state) => {
  const tryNumber = state.tries + 1;
  if (tryNumber >= 3) {
    return {
      ok: true,
      message: 'Successfully completed',
      tries: tryNumber,
    };
  }
  // 前两次故意失败，靠条件边回到本节点，形成重试循环
  return {
    ok: false,
    message: `attempt ${tryNumber} failed`,
    tries: tryNumber,
  };
};

// 必须 new StateGraph(状态定义)。Graph.addNode 不是函数：
// 1. 有 Annotation 状态时用 StateGraph，不是 Graph
// 2. addNode 是实例方法，不能写 Graph.addNode(...)
const graph = new StateGraph(stateAnnotation)
  .addNode('attempt', tryNode)
  .addEdge(START, 'attempt')
  // ok 为 true → 结束；tries 已到上限 → 结束；否则回到 attempt
  // 不能只写 { true: END, false: 'attempt' }：
  // 第 3 次也是 ok:false，会永远循环
  .addConditionalEdges(
    'attempt',
    (state) => {
      if (state.ok || state.tries >= 3) return 'done';
      return 'retry';
    },
    {
      done: END,
      retry: 'attempt',
    },
  )
  .compile();

const result = await graph.invoke({ tries: 0, ok: false, message: '' });
console.log(result);
