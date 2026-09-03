import 'dotenv/config';
import { MilvusClient, MetricType } from '@zilliz/milvus2-sdk-node';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';

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

const chatModel = new ChatOpenAI({
  apiKey: process.env.OPEN_API_KEY,
  modelName: process.env.MODEL_NAME,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
});

const client = new MilvusClient({
  address: 'localhost:19530',
});

const getEmbedding = async (text) => {
  const txt = await embeddingModel.embedQuery(text);
  return txt;
};

const retrieverSearchWithMilvus = async (vector, k) => {
  const result = await client.search({
    collection_name: COLLECTION_NAME,
    vector: vector,
    limit: k,
    output_fields: ['id', 'content', 'mood', 'date', 'tags'],
    metric_type: MetricType.COSINE,
  });
  return result.results;
};

async function main() {
  await client.connectPromise;

  const query = '最近做了什么让我感到快乐的事情？';
  const vector = await getEmbedding(query);
  const vectorResults = await retrieverSearchWithMilvus(vector, 2);
  console.log(vectorResults);

  const prompt = `根据以下内容:
${vectorResults.map((item) => item.content).join('\n')}
回答问题: ${query}`;
  const response = await chatModel.invoke(prompt);
  console.log(response.content);

  await client.closeConnection();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
