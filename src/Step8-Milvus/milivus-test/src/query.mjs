import 'dotenv/config';
import { MilvusClient, MetricType } from '@zilliz/milvus2-sdk-node';
import { OpenAIEmbeddings } from '@langchain/openai';

const COLLECTION_NAME = 'ai_dairy_data';
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

const getEmbedding = async (text) => embeddingModel.embedQuery(text);

async function main() {
  const vector = await getEmbedding('做饭');

  const result = await client.search({
    collection_name: COLLECTION_NAME,
    vector: vector,
    limit: 2,
    output_fields: ['id', 'content', 'mood', 'date', 'tags'],
    metric_type: MetricType.COSINE,
  });

  console.log(result.results);
  await client.closeConnection();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
