import 'dotenv/config';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import 'cheerio';
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
  temperature: 0,
});

const cheerioLoader = new CheerioWebBaseLoader(
  'https://juejin.cn/post/7233327509919547452',
  {
    selector: '.main-area p',
  },
);

const doucments = await cheerioLoader.load();
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 400,
  chunkOverlap: 50, // 分块之间的重叠字符数
  separators: ['。', '？', '！'], // 分块的分割符
});

const splittedDocuments = await splitter.splitDocuments(doucments);
console.log(splittedDocuments);
