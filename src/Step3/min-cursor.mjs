import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { HumanChatMessage, SystemChatMessage, ToolMessage } from '@langchain/schema';
import { readFileTool, writeFileTool, excuteCommandTool, listDirectoryTool } from './all-tools.mjs';

const model = new ChatOpenAI({
  modelName: 'qwen-plus',
  temperature: 0,
  apiKey: process.env.OPENAI_API_KEY,
   configration: {
    baseUrl: process.env.OPENAI_API_BASE_URL,
  },
});

const tools = [readFileTool, writeFileTool, excuteCommandTool, listDirectoryTool];

const modelWithTools = model.bindTools(tools);

// 执行函数
async function runAgentWithTools(query, maxIterations = 30) {
  const messages = [
     new SystemMessage(`你是一个项目管理助手，使用工具完成任务。
      当前工作目录: ${process.cwd()}

      工具：
      1. read_file: 读取文件
      2. write_file: 写入文件
      3. execute_command: 执行命令（支持 workingDirectory 参数）
      4. list_directory: 列出目录

      重要规则 - execute_command：
      - workingDirectory 参数会自动切换到指定目录
      - 当使用 workingDirectory 时，绝对不要在 command 中使用 cd
      - 错误示例: { command: "cd react-todo-app && pnpm install", workingDirectory: "react-todo-app" }
      这是错误的！因为 workingDirectory 已经在 react-todo-app 目录了，再 cd react-todo-app 会找不到目录
      - 正确示例: { command: "pnpm install", workingDirectory: "react-todo-app" }
      这样就对了！workingDirectory 已经切换到 react-todo-app，直接执行命令即可

      回复要简洁，只说做了什么`),

     new HumanMessage(query) 
  ];

  for (let i = 0; i < maxIterations; i++) {
    
  }
}