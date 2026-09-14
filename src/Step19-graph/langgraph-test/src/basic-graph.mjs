import { Annotation, StateGraph, START, END } from '@langchain/langgraph';

// Annotation.Root：定义整张图共享的「状态结构」（相当于全局一份 state）
// 节点只能读写这里声明过的字段
const StateAnnotation = Annotation.Root({
  // 声明一个叫 text 的状态通道；节点 return { text: '...' } 就会写到这里
  text: Annotation({
    // reducer：同一字段被多次更新时怎么合并
    // (_prev, next) => next 表示后写的覆盖前面的（Last Write Wins）
    reducer: (_prev, next) => next,
    // default 必须是工厂函数，图启动时调用一次得到初始值
    // 写成 default: '' 会报 initialValueFactory is not a function
    default: () => '',
  }),
});

// 节点函数：入参是当前完整 state，返回值是「要更新的字段」（partial state）
// LangGraph 会把返回对象交给对应字段的 reducer 合并进 state
const step1 = (state) => {
  return { text: `${state.text} -> Step1` };
};
const step2 = (state) => {
  return { text: `${state.text} -> Step2` };
};

// StateGraph：用上面的状态定义搭一张有向图
// 必须 new，不能写成 StateGraph(...)
const graph = new StateGraph(StateAnnotation)
  // addNode(名字, 函数)：注册一个可执行节点
  .addNode('step1', step1)
  .addNode('step2', step2)
  // addEdge：规定执行顺序。START / END 是图的入口和出口常量
  .addEdge(START, 'step1')
  .addEdge('step1', 'step2')
  .addEdge('step2', END)
  // compile：把「图纸」编译成可运行的图；invoke / getGraphAsync 都在编译结果上调用
  .compile();

// getGraphAsync：取出图的拓扑结构（节点 + 边），用来可视化，不执行节点
const drawable = await graph.getGraphAsync();
// drawMermaid：把拓扑转成 Mermaid 文本，可贴到支持 Mermaid 的 Markdown 里看流程图
const mermaid = drawable.drawMermaid({ withStyles: true });
console.log(mermaid);

// invoke：真正跑一遍图。传入的对象会写入初始 state（这里是 text）
// 执行路径：START → step1 → step2 → END
// 最终 state：{ text: 'Hello, World! -> Step1 -> Step2' }
const result = await graph.invoke({ text: 'Hello, World!' });
console.log(result);
