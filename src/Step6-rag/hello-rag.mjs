import 'dotenv/config';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
  temperature: 0,
});

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPEN_API_KEY,
  modelName: process.env.EMBEDDING_MODEL_NAME,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
});

const documents = [
  new Document({
    pageContent: `光光是一个活泼开朗的小男孩，他有一双明亮的大眼睛，总是带着灿烂的笑容。光光最喜欢的事情就是在操场上奔跑踢球，他是班上足球队的主力前锋，每次进球都会兴奋地跳起来，仿佛永远都有用不完的精力，把快乐传递给每一个人。`,
    metadata: {
      chapter: 1,
      character: '光光',
      type: '角色介绍',
      mood: '活泼',
    },
  }),
  new Document({
    pageContent: `东东是光光最好的朋友，他是一个安静而聪明的男孩。东东喜欢读书和画画，他的画总是充满了奇妙的想象力——蔚蓝的天空会游着彩色的鱼。课间休息时，他总是坐在座位上安静地涂涂画画，而光光则会趴在桌边看他画画，两个人一静一动，却格外投缘。`,
    metadata: {
      chapter: 2,
      character: '东东',
      type: '角色介绍',
      mood: '温馨',
    },
  }),
  new Document({
    pageContent: `有一天，学校要举办一场足球比赛，光光非常兴奋，他邀请东东一起参加。但是东东从来没有踢过足球，他担心自己笨拙的脚法会拖累队伍，低着头有些犹豫。光光却一把搂住他的肩膀说："没关系！我可以教你呀！我们一起练习，一定能踢好的！"`,
    metadata: {
      chapter: 3,
      character: '光光和东东',
      type: '友情情节',
      mood: '鼓励',
    },
  }),
  new Document({
    pageContent: `比赛那天终于到了，光光和东东一起站在球场上。虽然东东的技术还不够熟练，但他非常努力，而光光则像一阵风一样在球场上穿梭。下半场比分胶着时，光光毫不犹豫地把球传给了东东，东东一脚射门——球进了！全场爆发出雷鸣般的欢呼声。`,
    metadata: {
      chapter: 5,
      character: '光光和东东',
      type: '高潮转折',
      mood: '激动',
    },
  }),
  new Document({
    pageContent: `从那以后，光光和东东成为了学校里最要好的朋友。光光教东东运动，东东教光光画画，他们互相学习，取长补短。光光的画里开始有了奔跑的小人，东东也学会了在球场上勇敢争抢。每天放学后，他们要么在操场上挥洒汗水，要么在教室里描绘梦想。`,
    metadata: {
      chapter: 6,
      character: '光光和东东',
      type: '结局',
      mood: '欢乐',
    },
  }),
  new Document({
    pageContent: `多年后，光光成为了一名职业足球运动员，而东东成为了一名优秀的插画师。虽然他们走上了不同的道路，生活在不同的城市，但彼此的友谊从未改变。光光每次获胜后都会分享东东画的插画，东东每次画展光光都会骄傲地赶来支持，这份友情跨越了时光。`,
    metadata: {
      chapter: 7,
      character: '光光和东东',
      type: '尾声',
      mood: '温馨',
    },
  }),
];

const vectorStore = await MemoryVectorStore.fromDocuments(
  documents,
  embeddings,
);

const retriever = vectorStore.asRetriever({ k: 3 });

const questions = ['东东和光光是如何成为朋友的'];

for (const question of questions) {
  // 以下两个函数均返回文档，但是similaritySearchWithScore 返回分数，做循环是为了方便展示分数

  // 获取相似度高的3个向量文档，不返回分数
  const retriedDocs = await retriever.invoke(question);
  // console.log(retriedDocs);

  // 返回相似度高的文档和分数 【文档，分数】
  const scoredDocs = await vectorStore.similaritySearchWithScore(question, 3);
  console.log(scoredDocs);

  // 打印用到的文档和相似度评分
  retriedDocs.forEach((doc, index) => {
    console.log(`文档${index + 1}:`, doc.pageContent);

    // similaritySearchWithScore 返回的是 [Document, score]
    const scoredRes = scoredDocs.find(
      ([scoredDoc]) => scoredDoc.pageContent === doc.pageContent,
    );
    const score = scoredRes?.[1];
    const similarityScore = score != null ? (1 - score).toFixed(4) : null;
    console.log(`相似度评分:`, similarityScore);
  });

  // 根据返回结果，作为背景，构建上下文，然后生成答案
  const context = retriedDocs
    .map((doc, i) => `[片段${i + 1}]: ${doc.pageContent}`)
    .join('\n=====\n');

  const prompt = `
    ${context}
    <问题>
    ${question}
    </问题>
    `;

  const answer = await model.invoke(prompt);
  console.log(`答案:`, answer.content);
  console.log('--------------------------------');
}
