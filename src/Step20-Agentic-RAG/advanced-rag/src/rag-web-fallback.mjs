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
  enough: Annotation,
  web_search_content: Annotation,
});

const RouterSchema = z.object({
  router: z.string().describe('路由'),
  reason: z.string().describe('理由'),
});

const WebSearchSchema = z.object({
  enough: z.boolean().describe('是否足够回答问题'),
  reason: z.string().describe('理由'),
  content: z.string().describe('内容'),
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

const evaluateNode = async (state) => {
  const { question, documents, k, genaration, web_search_content } = state;
  const llm = model.withStructuredOutput(WebSearchSchema);
  const prompt = `
  你是一个阅读助手，判断是否需要web检索来回答用户的问题：
  ${question}
  这是文本返回的结果${documents}
  ${web_search_content ? `这是web检索返回的结果${web_search_content}` : ''}
  规则： 如果文本返回的结果足够回答问题，则返回enough: true，否则返回enough: false。
  并且给出理由。
  `;
  const result = await llm.invoke(prompt);
  return {
    question,
    documents,
    k,
    genaration,
    web_search_content: web_search_content ? web_search_content : '',
    enough: result.enough,
    reason: result.reason,
  };
};

const webSearchNode = async (state) => {
  const { question, enough, reason, content } = state;
  const url = 'https://api.bochaai.com/v1/web-search';
  const apiKey = process.env.BO_CHA_API_KEY?.trim();
  const body = {
    query: question,
    count: 5,
    freshness: 'noLimit',
    summary: true,
  };
  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const raw = await response.json();
  return {
    question,
    enough,
    reason,
    web_search_content: raw.data.webPages?.value
      ?.map((result) => result.summary)
      ?.join('\n\n'),
  };
};

const directorAnswer = async (state) => {
  return state.documents.map((doc) => doc.content).join('\n\n');
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
      fullResponse = fullResponse.concat(chunk.content);
      process.stdout.write(chunk.content);
    }
    return {
      question,
      documents: fullResponse,
      k,
      genaration,
    };
  } catch (error) {
    console.error('生成失败', error);
  }
};

const graph = new StateGraph(StateAnnotation)
  .addNode('routerNode', routerNode)
  .addNode('directorAnswer', directorAnswer)
  .addNode('retrieveNode', retrieveNode)
  .addNode('evaluateNode', evaluateNode)
  .addNode('generateNode', generateNode)
  .addNode('webSearchNode', webSearchNode)
  .addEdge(START, 'routerNode')
  .addConditionalEdges('routerNode', (state) => state.router, {
    simple: 'directorAnswer',
    complex: 'retrieveNode',
  })
  .addEdge('retrieveNode', 'evaluateNode')
  .addConditionalEdges('evaluateNode', (state) => state.enough, {
    true: 'generateNode',
    false: 'webSearchNode',
  })
  .addEdge('webSearchNode', 'evaluateNode')
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

  const question = '如何评价《斗破苍穹》？详细的说说';
  const retrieveResult = await graph.invoke({
    question: question,
    k: TOP_K,
    genaration: '',
    documents: [],
  });
  console.log(retrieveResult);
};

main();
