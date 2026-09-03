import 'dotenv/config';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OpenAIEmbeddings } from '@langchain/openai';
import {
  MilvusClient,
  MetricType,
  DataType,
  IndexType,
} from '@zilliz/milvus2-sdk-node';
import { EPubLoader } from '@langchain/community/document_loaders/fs/epub';
import { htmlToText } from 'html-to-text';
import { parse } from 'path';

const COLLECTION_NAME = 'tlbook_content';
const DIMENSION = 1024;
const EBOOK_PATH = './src/天龙八部.epub';
const BOOK_NAME = parse(EBOOK_PATH).name;

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

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 50,
});

const getEmbeddings = async (texts) => {
  console.log(`[getEmbeddings] 开始，共 ${texts.length} 条`);
  const vectors = await embeddingModel.embedDocuments(texts);
  console.log(
    `[getEmbeddings] 完成，共 ${vectors.length} 条，维度 ${vectors[0]?.length ?? 0}`,
  );
  return vectors;
};

// Milvus 数据库 初始化，确保集合索引
const ensureCollectionExists = async (collectionName, bookId) => {
  console.log(
    `[ensureCollection] 检查集合 ${collectionName}，bookId=${bookId}`,
  );
  const exits = await client.hasCollection({
    collection_name: collectionName,
  });
  console.log(`[ensureCollection] hasCollection = ${exits.value}`);
  if (!exits.value) {
    console.log('[ensureCollection] 集合不存在，开始 createCollection...');
    await client.createCollection({
      collection_name: collectionName,
      fields: [
        {
          name: 'id',
          data_type: DataType.VarChar,
          is_primary_key: true,
          max_length: 100,
        },
        {
          name: 'book_name',
          data_type: DataType.VarChar,
          max_length: 255,
        },
        {
          name: 'book_id',
          data_type: DataType.VarChar,
          max_length: 100,
        },
        {
          name: 'chapter_id',
          data_type: DataType.Int64,
        },
        {
          name: 'index',
          data_type: DataType.Int64,
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
      ],
    });
    console.log('[ensureCollection] createCollection 完成');

    console.log('[ensureCollection] 开始 createIndex...');
    await client.createIndex({
      collection_name: collectionName,
      field_name: 'vector',
      index_type: IndexType.IVF_FLAT,
      metric_type: MetricType.COSINE,
      params: {
        nlist: 128,
      },
    });
    console.log('[ensureCollection] createIndex 完成');
  } else {
    console.log('[ensureCollection] 集合已存在，跳过创建');
  }
};

// 插入分片
const insertChunks = async (chunks, bookId, chapterIndex) => {
  console.log(
    `[insertChunks] 章节 ${chapterIndex}，共 ${chunks.length} 个分片，bookId=${bookId}`,
  );
  if (chunks.length === 0) {
    console.log(`[insertChunks] 章节 ${chapterIndex} 无分片，跳过`);
    return;
  }

  console.log('[insertChunks] 开始 embedding...');

  const entities = await Promise.all(
    chunks.map(async (chunk, index) => {
      const vector = await getEmbeddings([chunk]);
      return {
        vector: vector,
        content: chunk,
        book_id: bookId,
        chapter_id: chapterIndex,
        index: index,
        book_name: BOOK_NAME,
        id: `${bookId}_${chapterIndex}_${index}`,
      };
    }),
  );

  await client.insert({
    collection_name: COLLECTION_NAME,
    data: entities,
  });
};

// 读取 epub 文件
const readEbook = async (bookId) => {
  console.log(`[readEbook] 开始加载 ${EBOOK_PATH}`);
  const loader = new EPubLoader(EBOOK_PATH, { splitChapters: true });
  const documents = await loader.load();
  console.log(`[readEbook] 加载完成，共 ${documents.length} 章`);
  for (let index = 0; index < documents.length; index++) {
    const document = documents[index];
    console.log(
      `[readEbook] 处理第 ${index + 1}/${documents.length} 章，文本长度 ${document.pageContent?.length ?? 0}`,
    );
    const chunks = await textSplitter.splitText(document.pageContent);
    console.log(
      `[readEbook] 第 ${index + 1} 章分片完成，共 ${chunks.length} 片`,
    );
    await insertChunks(chunks, bookId, index);
  }

  console.log('[readEbook] flush 落盘...');
  await client.flush({ collection_names: [COLLECTION_NAME] });
  console.log('[readEbook] loadCollection...');
  await client.loadCollection({ collection_name: COLLECTION_NAME });
  console.log('[readEbook] 全部章节处理完成');
};

const main = async () => {
  const bookId = 'book_001';
  console.log(`[main] 启动，bookId=${bookId}`);

  console.log('[main] 1. 连接 Milvus...');
  await client.connectPromise;
  console.log('[main] 1. Milvus 已连接');

  console.log('[main] 2. 确保 collection 和索引...');
  await ensureCollectionExists(COLLECTION_NAME, bookId);
  console.log('[main] 2. collection 就绪');

  console.log('[main] 3. 读取并写入 epub...');
  await readEbook(bookId);
  console.log('[main] 全部完成');
  await client.closeConnection();
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
