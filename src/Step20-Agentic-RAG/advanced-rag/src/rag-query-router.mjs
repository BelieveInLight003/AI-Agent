import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Annotation, StateGraph, START, END } from '@langchain/langgraph';
import { Milvus } from '@langchain/community/vectorstores/milvus';
import { z } from 'zod';

let collection = 'tlbook_content';
const TOP_K = 5;

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  temperature: 0,
  apiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
});

const embeddings = new OpenAIEmbeddings({
  model: process.env.EMBEDDING_MODEL_NAME?.trim(),
  dimensions: 1024,
  apiKey: process.env.OPEN_API_KEY?.trim(),
  configuration: {
    baseURL: process.env.OPEN_BASE_URL?.trim(),
  },
});

const StateAnnotation = Annotation.Root({
  question: Annotation,
  documents: Annotation,
  k: Annotation,
  generation: Annotation,
  router: Annotation,
  reason: Annotation,
});

const RouterSchema = z.object({
  router: z.string().describe('路由'),
  reason: z.string().describe('理由'),
});

let vectorStore;

const routerNode = async (state) => {
  const { question, documents, k, genaration } = state;
  const prompt = `
  你是一个小说阅读助手，针对用户的问题，判断是否需要web检索来回答：
  ${question}

  规则： simple 代表只需要简单回答，不需要web检索；web-search 代表需要web检索来回答。
        complex 代表需要复杂回答，需要web检索来回答。
  `;
  const llm = model.withStructuredOutput(RouterSchema);
  const result = await llm.invoke(prompt);
  return {
    question,
    router: result.router,
    reason: result.reason,
    documents,
    k,
    genaration,
  };
};

const retrieveNode = async (state) => {
  const { question, router, reason, documents, k, genaration } = state;
  const results = await vectorStore.similaritySearchWithScore(question, k);
  const newDocuments = results.map(([result, score]) => ({
    score: score,
    content: result.pageContent,
    book_id: result.metadata.book_id,
    chapter_num: result.metadata.chapter_num,
    index: result.metadata.index,
  }));
  return {
    question,
    k,
    documents: newDocuments,
  };
};

const directorAnswer = async (state) => {
  return state;
};

const generateNode = async (state) => {
  const { question, documents, k, genaration } = state;
  try {
    const promptHis = documents
      .map((doc) => `第${doc.chapter_num}章：第${doc.index}节：${doc.content}`)
      .join('\n\n');
    const prompt = `
   你是一个小说阅读助手，请根据以下内容：
   ${promptHis}
   回答用户的问题：${question}
   `;

    const chunks = await model.stream(prompt);
    let fullResponse = '';
    for await (const chunk of chunks) {
      fullResponse.concat(chunk.content);
      process.stdout.write(chunk.content);
    }
    return {
      question,
      // ❌ 把 documents 覆盖成了模型输出，检索结果丢了；答案应写到 generation
      documents: fullResponse,
      k,
      genaration,
    };
  } catch (error) {
    console.error('生成失败', error);
    // ❌ catch 没有 return，图会拿到 undefined
  }
};

const graph = new StateGraph(StateAnnotation)
  .addNode('routerNode', routerNode)
  .addNode('directorAnswer', directorAnswer)
  .addNode('retrieveNode', retrieveNode)
  .addNode('generateNode', generateNode)
  .addEdge(START, 'routerNode')
  .addConditionalEdges('routerNode', (state) => state.router, {
    simple: 'directorAnswer',
    complex: 'retrieveNode',
  })
  .addEdge('retrieveNode', 'generateNode')
  .addEdge('directorAnswer', END)
  .addEdge('generateNode', END)
  .compile();

const main = async () => {
  vectorStore = await Milvus.fromExistingCollection(embeddings, {
    collectionName: collection,
    url: 'localhost:19530',
    textField: 'content',
    primaryField: 'id',
    vectorField: 'vector',
    indexCreateOptions: {
      metric_type: 'COSINE',
      index_type: 'HNSW',
      params: {
        efConstruction: 200,
        M: 16,
      },
      search_params: {
        ef: 64,
      },
    },
  });
  vectorStore.indexSearchParams = { metric_type: 'COSINE', ef: 64 };

  try {
    await vectorStore.client.loadCollection({ collection_name: collection });
    console.log('Milvus  已连接');
  } catch (error) {
    console.error('Milvus 连接失败', error);
  }

  const question = '萧峰的结局是什么？';
  const retrieveResult = await graph.invoke({
    question: question,
    k: TOP_K,
    genaration: '',
    documents: [],
  });
  console.log(retrieveResult);
};

main();
