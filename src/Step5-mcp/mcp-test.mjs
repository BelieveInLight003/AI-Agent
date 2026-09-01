import 'dotenv/config';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { ChatOpenAI } from '@langchain/openai';
import chalk from 'chalk';
import { HumanMessage, ToolMessage } from '@langchain/core/messages';

const model = new ChatOpenAI({
  modelName: 'qwen-plus',
  apiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
});

const mcpClient = new MultiServerMCPClient({
  'my-mcp-server': {
    command: 'node',
    args: ['src/Step4/my-mcp-server.mjs'],
  },
  'amap-maps-streamableHTTP': {
    url: `https://mcp.amap.com/mcp?key=${process.env.AMAP_API_KEY}`,
  },
  filesystem: {
    command: '/Users/balala/.nvm/versions/node/v22.23.2/bin/npx',
    args: [
      '-y',
      '@modelcontextprotocol/server-filesystem',
      ...(process.env.ALLOWED_PATHS.split(',') || []),
    ],
  },
  'chrome-devtools': {
    command: '/Users/balala/.nvm/versions/node/v22.23.2/bin/npx',
    args: ['-y', 'chrome-devtools-mcp@latest'],
  },
});

const tools = await mcpClient.getTools();
const modelWithTools = model.bindTools(tools);

async function runAgentWithTools(query, maxIterations = 30) {
  const messages = [new HumanMessage(query)];

  for (let i = 0; i < maxIterations; i++) {
    console.log(chalk.green(`Iteration ${i + 1}: 正在等待AI思考。。。`));
    const response = await modelWithTools.invoke(messages);
    messages.push(response);

    if (response.tool_calls && response.tool_calls.length === 0) {
      console.log(`检测到AI最终回复：${response.content}`);
      return response.content;
    }

    console.log(chalk.bgBlue(`${response.tool_calls.length}个工具被调用`));
    console.log(
      chalk.bgBlue(
        `检测到AI需要使用工具：${response.tool_calls.map((toolCall) => toolCall.name).join(', ')}`,
      ),
    );
    for (const toolCall of response.tool_calls) {
      const foundTool = tools.find((tool) => tool.name === toolCall.name);

      if (foundTool) {
        const toolResponse = await foundTool.invoke(toolCall.args);

        let contentStr;
        if (typeof toolResponse === 'string') {
          contentStr = toolResponse;
        } else if (toolResponse && toolResponse.text) {
          contentStr = toolResponse.text;
        }

        messages.push(
          new ToolMessage({
            content: contentStr,
            tool_call_id: toolCall.id,
          }),
        );
      }
    }
  }

  // 返回最后一次思考的结果
  return messages[messages.length - 1].content;
}

const query =
  // '请告诉北京南站的酒店, 路线规划生成文档保存到/Users/balala/Desktop/workspace/Summary/AI-Agent/src/Step5/data的一个md文件里';
  '北京南站的附近酒店, 最近的3个酒店，找到图片，打开浏览器，展示每个酒店的图片，每个tab一个url展示，并且把页面标题改成酒店名称';
const result = await runAgentWithTools(query);
console.log(chalk.blue(`最终结果: ${result}`));
await mcpClient.close();
