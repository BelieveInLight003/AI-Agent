import 'dotenv/config';
import { Annotation, StateGraph, START, END } from '@langchain/langgraph';
import { awaitAllCallbacks } from '@langchain/core/callbacks/promises';

// 这份图的共享 state：三个独立字段（通道）
// query = 用户输入；route = 路由结果（'math' | 'chat'）；answer = 最终回复
const StateAnnotation = Annotation.Root({
  // 注意：这里已经占用了名字 "route"
  // LangGraph 里「state 字段名」和「节点名」共用同一套命名空间，不能重复
  route: Annotation({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
  query: Annotation({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
  answer: Annotation({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
});

// 只负责判断走哪条路，把结论写进 state.route
// 函数名叫 routeNode 没问题；冲突的是 addNode 的第一个参数（节点 ID）
const routeNode = (state) => {
  const isMath = /[+\-*/]/.test(state.query);
  return { route: isMath ? 'math' : 'chat' };
};

const chatNode = (state) => {
  return { answer: `Chat: ${state.query}` };
};

const mathNode = (state) => {
  try {
    const result = String(eval(state.query));
    return { answer: result };
  } catch (error) {
    return { answer: "Sorry, I can't do that." };
  }
};

const graph = new StateGraph(StateAnnotation)
  // 这里必须叫 router，不能叫 route。
  // addNode('route', ...) 会报：
  //   "route is already being used as a state attribute, cannot also be used as a node name."
  // 因为 Root 里已经有字段 route。节点名改成 router 后：
  //   - 节点 ID = router（图上的一个点）
  //   - 状态字段 = route（存 'math' / 'chat'）
  // 两者职责不同，名字也必须不同。
  .addNode('router', routeNode)
  .addNode('chat', chatNode)
  .addNode('math', mathNode)
  .addEdge(START, 'router')
  // 条件边：从 router 出发，用函数读 state.route，再按映射表跳到对应节点
  // 第二个参数返回的是「映射表的 key」，不是节点名本身
  // 第三个参数：{ 路由值: 目标节点名 }  →  'chat' 去 chat 节点，'math' 去 math 节点
  .addConditionalEdges('router', (state) => state.route, {
    chat: 'chat',
    math: 'math',
  })
  .addEdge('chat', END)
  .addEdge('math', END)
  .compile();

const drawable = await graph.getGraphAsync();
const mermaid = drawable.drawMermaid({ withStyles: true });
console.log(mermaid);

// 执行：START → router（写入 route:'math'）→ math → END
const result = await graph.invoke({ query: '1 + 1' });
console.log(result);

// Node 脚本结束得太快时，LangSmith 的上报还在后台，进程一退出记录就丢了
await awaitAllCallbacks();
