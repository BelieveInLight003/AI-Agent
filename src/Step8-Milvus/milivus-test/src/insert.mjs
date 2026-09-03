import 'dotenv/config';
import {
  MilvusClient,
  DataType,
  MetricType,
  IndexType,
} from '@zilliz/milvus2-sdk-node';
import { OpenAIEmbeddings } from '@langchain/openai';

const DIMENSION = 1024;
const COLLECTION_NAME = 'ai_dairy_data';

const client = new MilvusClient({
  address: 'localhost:19530',
});

const embeddingModel = new OpenAIEmbeddings({
  modelName: process.env.EMBEDDING_MODEL_NAME,
  apiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
  dimensions: DIMENSION,
});

const getEmbedding = async (text) => {
  const result = await embeddingModel.embedQuery(text);
  return result;
};

async function main() {
  console.log('1. 检查集合是否已存在...');
  const exists = await client.hasCollection({
    collection_name: COLLECTION_NAME,
  });
  if (exists.value) {
    console.log('集合已存在，先删除再重建，否则 createCollection 会卡住或报错');
    await client.dropCollection({ collection_name: COLLECTION_NAME });
  }

  console.log('2. 创建集合...');
  await client.createCollection({
    collection_name: COLLECTION_NAME,
    fields: [
      {
        name: 'id',
        data_type: DataType.VarChar,
        is_primary_key: true,
        max_length: 64,
      },
      {
        name: 'content',
        data_type: DataType.VarChar,
        max_length: 2000,
      },
      {
        name: 'vector',
        data_type: DataType.FloatVector,
        dim: DIMENSION,
      },
      {
        name: 'mood',
        data_type: DataType.VarChar,
        max_length: 32,
      },
      {
        name: 'date',
        data_type: DataType.VarChar,
        max_length: 32,
      },
      {
        name: 'tags',
        data_type: DataType.Array,
        element_type: DataType.VarChar,
        max_capacity: 8,
        max_length: 32,
      },
    ],
  });

  console.log('3. 创建索引...');
  await client.createIndex({
    collection_name: COLLECTION_NAME,
    field_name: 'vector',
    index_type: IndexType.FLAT,
    metric_type: MetricType.COSINE,
  });

  const data = [
    {
      id: 'diary_001',
      content:
        '今天天气很好，去公园散步了，心情愉快。看到了很多花开了，春天真美好。',
      date: '2026-01-10',
      mood: 'happy',
      tags: ['生活', '散步'],
    },
    {
      id: 'diary_002',
      content:
        '今天工作很忙，完成了一个重要的项目里程碑。团队合作很愉快，感觉很有成就感。',
      date: '2026-01-11',
      mood: 'excited',
      tags: ['工作', '成就'],
    },
    {
      id: 'diary_003',
      content:
        '周末和朋友去爬山，天气很好，心情也很放松。享受大自然的感觉真好。',
      date: '2026-01-12',
      mood: 'relaxed',
      tags: ['户外', '朋友'],
    },
    {
      id: 'diary_004',
      content:
        '今天学习了 Milvus 向量数据库，感觉很有意思。向量搜索技术真的很强大。',
      date: '2026-01-12',
      mood: 'curious',
      tags: ['学习', '技术'],
    },
    {
      id: 'diary_005',
      content:
        '晚上做了一顿丰盛的晚餐，尝试了新菜谱。家人都说很好吃，很有成就感。',
      date: '2026-01-13',
      mood: 'proud',
      tags: ['美食', '家庭'],
    },
  ];

  console.log('4. 调用 embedding 接口...');
  const diaryData = await Promise.all(
    data.map(async (item) => ({
      ...item,
      vector: await getEmbedding(item.content),
    })),
  );

  console.log('5. 插入数据...');
  const insertResult = await client.insert({
    collection_name: COLLECTION_NAME,
    data: diaryData,
  });
  console.log(insertResult);

  console.log('6. flush 落盘...');
  await client.flush({ collection_names: [COLLECTION_NAME] });

  console.log('7. 加载集合...');
  await client.loadCollection({ collection_name: COLLECTION_NAME });

  console.log(
    `已插入 ${insertResult.insert_cnt} 条日记到集合 ${COLLECTION_NAME}`,
  );
  await client.closeConnection();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
