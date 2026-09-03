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
  // 单条删除
  const dairy_id = 'diary_001';
  const result = await client.delete({
    collection_name: COLLECTION_NAME,
    filter: `id == '${dairy_id}'`,
  });
  console.log(result);

  // 批量删除
  const dairy_ids = ['diary_002', 'diary_003'];
  // 避雷，id 需要加“”
  // 不能写 dairy_ids.join(',') 这样写会把 dairy_ids 当成字段名来处理，而不是字符串，导致找不到id 删除失败
  // 所以需要用 map 方法将每个 id 加上引号，然后再用 join 方法将它们连接起来
  // 这样写就可以正确地删除 id 为 dairy_002 和 dairy_003 的记录
  const filter = dairy_ids.map((id) => `"${id}"`).join(',');
  const batchResult = await client.delete({
    collection_name: COLLECTION_NAME,
    filter: `id in [${filter}]`,
  });
  console.log(batchResult);

  // 条件删除
  const condition = 'mood == "proud"';
  const conditionResult = await client.delete({
    collection_name: COLLECTION_NAME,
    filter: condition,
  });
  console.log(conditionResult);

  await client.closeConnection();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
