import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import chalk from 'chalk';
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from '@langchain/core/messages';
import { JsonOutputToolsParser } from '@langchain/core/output_parsers/openai_tools';
import {
  readFileTool,
  writeFileTool,
  excuteCommandTool,
  listDirectoryTool,
} from './all-tools.mjs';

const tools = [
  readFileTool,
  writeFileTool,
  excuteCommandTool,
  listDirectoryTool,
];
const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
  temperature: 0,
});

const modelWithTools = model.bindTools(tools);

const answerQuestion = async (messages) => {
  const streamRes = await modelWithTools.stream(messages);

  let fullMessages = '';

  const previousLengthMap = new Map();

  const toolParser = new JsonOutputToolsParser();

  for await (const chunk of streamRes) {
    // console.log('chunk', chunk);
    fullMessages += chunk.content;

    const toolParserRes = await toolParser.parseResult([
      { message: fullMessages },
    ]);
    console.log('toolParserRes', toolParserRes);

    if (toolParserRes && toolParserRes.length > 0) {
      const toolName = JSON.parse(toolParserRes.tool_calls[0]).name;
      const content = JSON.parse(toolParserRes.tool_calls[0]).content;
      const id = JSON.parse(toolParserRes.tool_calls[0]).id;
      const lastLength = previousLengthMap.get(id) || 0;
      if (toolName === 'write_file') {
        if (lastLength < content.length) {
          const newContent = content.slice(lastLength);
          console.log('--------------------------');
          process.stdout.write(newContent);
          console.log('--------------------------');
          previousLengthMap.set(id, content.length);
        }
      } else {
        console.log('!!!!!!!!!!!!!!!!!!!!!!!!');
        process.stdout.write(chunk.content);
        console.log('!!!!!!!!!!!!!!!!!!!!!!!!');
      }
    }
  }
};

const main = async () => {
  const systemMessage = new SystemMessage(
    '你是一个数据分析师，请根据用户的需求，分析数据并返回JSON数据',
  );
  const humanMessage = new HumanMessage(`请帮我介绍一下，马化腾的个人信息`);
  const result = await answerQuestion([systemMessage, humanMessage]);
  console.log('result: ', result);
};

main();
