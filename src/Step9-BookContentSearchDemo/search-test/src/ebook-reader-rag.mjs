import 'dotenv/config';
import { MilvusClient, MetricType } from '@zilliz/milvus2-sdk-node';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';

const COLLECTION_NAME = 'tlbook_content';
const DIMENSION = 1024;

const embeddingModel = new OpenAIEmbeddings({
  apiKey: process.env.OPEN_API_KEY,
  modelName: process.env.EMBEDDING_MODEL_NAME,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
  dimensions: DIMENSION,
});

const getEmbedding = async (text) => {
  const embedding = await embeddingModel.embedQuery(text);
  return embedding;
};

const client = new MilvusClient({
  address: 'localhost:19530',
});

const chatModel = new ChatOpenAI({
  apiKey: process.env.OPEN_API_KEY,
  modelName: process.env.MODEL_NAME,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
});

const searchFromMilvus = async (query, k) => {
  const queryEmbedding = await getEmbedding(query);
  const searchResults = await client.search({
    collection_name: COLLECTION_NAME,
    vector: queryEmbedding,
    limit: k,
    metric_type: MetricType.COSINE,
    output_fields: [
      'content',
      'book_name',
      'book_id',
      'chapter_name',
      'chapter_id',
    ],
  });
  return searchResults.results;
};

const answerQuery = async (query, k) => {
  try {
    const retrieverContent = await searchFromMilvus(query, k);

    retrieverContent.forEach(async (item) => {
      console.log(`查到的相关文档信息如下：`);
      console.log(`书籍名称：${item.book_name}`);
      console.log(`书籍ID：${item.book_id}`);
      console.log('--------------------------------');
    });

    const prompt =
      retrieverContent
        .map(
          (item) =>
            `书籍名称：${item.book_name}\n书籍ID：${item.book_id}\n章节ID：${item.chapter_id}\n文档内容：${item.content}`,
        )
        .join('\n') + `\n问题：${query}`;

    const response = await chatModel.invoke(prompt);
    return response.content;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const main = async () => {
  await client.loadCollection({
    collection_name: COLLECTION_NAME,
  });

  const query = '王语嫣和段誉最后在一起了吗？';
  const res = await answerQuery(query, 5);
  console.log(`问题：${query}`);
  console.log(`答案：${res}`);

  await client.closeConnection();
};

main();
