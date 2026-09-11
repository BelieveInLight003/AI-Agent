import { Injectable, Inject } from '@nestjs/common';
import {
  BaseMessage,
  AIMessage,
  HumanMessage,
  SystemMessage,
  AIMessageChunk,
  ToolMessage,
} from '@langchain/core/messages';
import { z } from 'zod';
import { Runnable } from '@langchain/core/runnables';
import { ChatOpenAI } from '@langchain/openai';
import { tool } from '@langchain/core/tools';

const databse = [
  {
    userId: '1',
    name: 'John Smith',
    email: 'john.smith@example.com',
    phone: '1234567890',
    address: '123 Main St, Anytown, USA',
    city: 'Anytown',
    state: 'CA',
    zip: '12345',
    country: 'USA',
  },
  {
    userId: '2',
    name: 'Jane Johnson',
    email: 'jane.smith@example.com',
    phone: '0987654321',
    address: '456 Main St, Anytown, USA',
    city: 'Anytown',
    state: 'NY',
    zip: '67890',
    country: 'USA',
  },
  {
    userId: '3',
    name: 'Jim Beam',
    email: 'jim.beam@example.com',
    phone: '1122334455',
    address: '789 Main St, Anytown, USA',
    city: 'Anytown',
    state: 'TX',
    zip: '90123',
    country: 'USA',
  },
];

const querySchema = z.object({
  userId: z.string(),
});

type QueryType = {
  userId: string;
};

const queryTools = tool(
  async (query: QueryType) => {
    const user = databse.find((user) => user.userId === query.userId);
    if (!user) {
      return `User ${query.userId} not found`;
    }
    return `User ${query.userId} found: ${user.name} ${user.email} ${user.phone} ${user.address} ${user.city} ${user.state} ${user.zip} ${user.country}`;
  },
  {
    name: 'query_user_info',
    description: '查询用户信息',
    schema: querySchema,
  },
);

@Injectable()
export class AiService {
  // 注意这里的类型
  private modelWithTools: Runnable<BaseMessage[], AIMessage>;

  constructor(
    @Inject('CHAT_MODEL') private readonly model: ChatOpenAI,
    @Inject('QUERY_USER_TOOL') private readonly queryUserTool: any,
    @Inject('SEND_EMAIL_TOOL') private readonly sendEmailTool: any,
    @Inject('WEB_SEARCH_TOOL') private readonly webSearchTool: any,
    @Inject('DB_CRUD_USERS_TOOL') private readonly dbCrudUsersTool: any,
  ) {
    this.modelWithTools = this.model.bindTools([
      this.queryUserTool,
      this.sendEmailTool,
      this.webSearchTool,
      this.dbCrudUsersTool,
    ]);
  }

  async runAgentWithTools(query: string) {
    const messages: BaseMessage[] = [
      new SystemMessage(
        'You are a helpful assistant that can answer questions and help with tasks.',
      ),
      new HumanMessage(query),
    ];

    while (true) {
      const response = await this.modelWithTools.invoke(messages);
      messages.push(response);
      const tool_calls = response.tool_calls;

      if (!tool_calls || tool_calls.length === 0) {
        return response.content as string;
      }

      for (const tool_call of tool_calls) {
        const tool_name = tool_call.name;
        const tool_args = tool_call.args;

        if (tool_name === 'query_user_info') {
          const result = await this.queryUserTool.invoke(
            tool_args as QueryType,
          );
          messages.push(
            new ToolMessage({
              content: result,
              tool_call_id: tool_call.id ?? '',
              name: tool_name,
            }),
          );
        } else if (tool_name === 'send_email') {
          console.log('send_email args', tool_args);
          const result = await this.sendEmailTool.invoke(tool_args);
          console.log('send_email result', result);
          messages.push(
            new ToolMessage({
              content: result,
              tool_call_id: tool_call.id ?? '',
              name: tool_name,
            }),
          );
        } else if (tool_name === 'web_search') {
          const result = await this.webSearchTool.invoke(tool_args);
          messages.push(
            new ToolMessage({
              content: result,
              tool_call_id: tool_call.id ?? '',
              name: tool_name,
            }),
          );
        } else if (tool_name === 'db_users_crud') {
          const result = await this.dbCrudUsersTool.invoke(tool_args);
          messages.push(
            new ToolMessage({
              content: result,
              tool_call_id: tool_call.id ?? '',
              name: tool_name,
            }),
          );
        }
      }
    }
  }

  async *runAgentByStream(query: string): AsyncIterable<string> {
    const messages: BaseMessage[] = [
      new SystemMessage(
        'You are a helpful assistant that can answer questions and help with tasks.',
      ),
      new HumanMessage(query),
    ];

    while (true) {
      const chunks = await this.modelWithTools.stream(messages);
      let fullMessage: AIMessageChunk | null = null;

      for await (const chunk of chunks as AsyncIterable<AIMessageChunk>) {
        fullMessage = fullMessage ? fullMessage.concat(chunk) : chunk;

        const hasAITool =
          !!chunk.tool_call_chunks && chunk.tool_call_chunks.length > 0;

        if (!hasAITool && chunk.content) {
          yield chunk.content as string;
        }
      }

      if (!fullMessage) {
        return;
      }

      messages.push(fullMessage);

      const tool_calls = fullMessage.tool_calls ?? [];
      if (!tool_calls.length) {
        return;
      }

      for (const tool_call of tool_calls) {
        const tool_name = tool_call.name;
        const tool_args = tool_call.args;

        if (tool_name === 'query_user_info') {
          const agrs = querySchema.parse(tool_args);
          const result = await this.queryUserTool.invoke(agrs);
          messages.push(
            new ToolMessage({
              content: result,
              tool_call_id: tool_call.id ?? '',
              name: tool_name,
            }),
          );
        } else if (tool_name === 'send_email') {
          const result = await this.sendEmailTool.invoke(tool_args);
          messages.push(
            new ToolMessage({
              content: result,
              tool_call_id: tool_call.id ?? '',
              name: tool_name,
            }),
          );
        } else if (tool_name === 'web_search') {
          const result = await this.webSearchTool.invoke(tool_args);
          messages.push(
            new ToolMessage({
              content: result,
              tool_call_id: tool_call.id ?? '',
              name: tool_name,
            }),
          );
        } else if (tool_name === 'db_users_crud') {
          const result = await this.dbCrudUsersTool.invoke(tool_args);
          messages.push(
            new ToolMessage({
              content: result,
              tool_call_id: tool_call.id ?? '',
              name: tool_name,
            }),
          );
        }
      }
    }
  }
}
