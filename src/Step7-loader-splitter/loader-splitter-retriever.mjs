import 'dotenv/config';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import 'cheerio';
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

// 模型
const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
  temperature: 0,
});

// 加载器
const cheerioLoader = new CheerioWebBaseLoader(
  'https://juejin.cn/post/7233327509919547452',
  {
    selector: '.main-area p',
  },
);

const doucments = await cheerioLoader.load();
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 400,
  chunkOverlap: 50, // 分块之间的重叠字符数
  separators: ['。', '？', '！'], // 分块的分割符
});

const splittedDocuments = await splitter.splitDocuments(doucments);
// console.log(splittedDocuments);

// 向量
const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPEN_API_KEY,
  modelName: process.env.EMBEDDING_MODEL_NAME,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
});

const vectorStore = await MemoryVectorStore.fromDocuments(
  splittedDocuments,
  embeddings,
);

// 查询
const retriever = await vectorStore.asRetriever({ k: 2 });

const questions = ['父亲的去世，对作者的人生态度产生了怎样的转变？'];

// RAG 流程
for (const question of questions) {
  const retrieverDocs = await retriever.invoke(question);

  const docsWithScore = await vectorStore.similaritySearchWithScore(
    question,
    2,
  );
  // console.log(`docsWithScore: ${docsWithScore}`);
  // 打印检索到的相关文档和评分
  retrieverDocs.forEach((doc) => {
    const resultWithScore = docsWithScore.find(
      ([d]) => d.pageContent === doc.pageContent,
    );
    console.log(`resultWithScore: ${resultWithScore}`);
    const score = resultWithScore ? resultWithScore[1] : null;

    const similarityScore =
      resultWithScore !== null ? (1 - resultWithScore[1]).toFixed(4) : null;

    console.log(
      `相似度: ${similarityScore} | 内容: ${resultWithScore.pageContent} | 来源: ${resultWithScore.metadata} ｜评分: ${score}`,
    );
  });

  // 生成答案
  const content = retrieverDocs
    .map((doc) => doc.pageContent)
    .join('\n\n=====\n\n');
  const response = await model.invoke(`
    You are a helpful assistant that can answer questions about the following text:
    ${content}
    Question: ${question}
    Answer:
  `);
  console.log(response.content);
}
