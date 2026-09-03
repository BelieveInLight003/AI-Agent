import 'dotenv/config';
import { MilvusClient } from '@zilliz/milvus2-sdk-node';
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

const getEmbedding = async (text) => {
  const txt = await embeddingModel.embedQuery(text);
  return txt;
};

async function main() {
  await client.connectPromise;

  const dairy_id = 'diary_001';
  const updateData = {
    id: dairy_id,
    content: '今天心情很好，一天投入学习，状态很好',
    mood: '开心',
    date: '2026-01-01',
    tags: ['学习', '状态很好'],
  };
  const vector = await getEmbedding(updateData.content);
  const result = await client.upsert({
    collection_name: COLLECTION_NAME,
    data: [{ ...updateData, vector }],
  });
  console.log(result);
  await client.closeConnection();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
