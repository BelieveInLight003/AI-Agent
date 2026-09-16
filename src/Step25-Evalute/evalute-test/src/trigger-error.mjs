import 'dotenv/config';
import { TextSplitter } from '@langchain/core/text_splitter';
import { readFile } from 'fs/promises';
import { MilvusVectorStore } from '@langchain/community/vectorstores/milvus';
import { OpenAIEmbeddings } from '@langchain/openai';
import { ChatOpenAI } from '@langchain/openai';
import { MilvusClient } from '@langchain/community/vectorstores/milvus';

const embeddings = new OpenAIEmbeddings({
  model: process.env.EMBEDDING_MODEL_NAME,
  openAIApiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
});

const collectionName = 'rag-test';
const address = process.env.MILVUS_ADDRESS || 'localhost:19530';
const vectorStore = new MilvusClient(embeddings, {
  address,
  collectionName: collectionName,
});

async function loadChunks(filePath) {}
