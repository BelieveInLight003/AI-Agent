import { MilvusClient, MetricType } from '@zilliz/milvus2-sdk-node';
import { OpenAIEmbeddings } from '@langchain/openai';
import 'dotenv/config';

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

const client = new MilvusClient({
  address: 'localhost:19530',
});

const getEmbedding = async (text) => {
  const embedding = await embeddingModel.embedQuery(text);
  return embedding;
};

const main = async () => {
  await client.loadCollection({
    collection_name: COLLECTION_NAME,
  });
  const query = await getEmbedding('段誉会什么武功？');
  const result = await client.search({
    collection_name: COLLECTION_NAME,
    vector: query,
    limit: 10,
    metric_type: MetricType.COSINE,
    output_fields: ['id', 'content', 'book_name', 'chapter_id', 'index'],
  });
  console.log(result.results);
};

main();
