import 'dotenv/config';
import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import {
  AIMessage,
  HumanMessage,
  createAgent,
  createMiddleware,
} from 'langchain';

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME?.trim(),
  apiKey: process.env.OPEN_API_KEY?.trim(),
  configuration: {
    baseURL: process.env.OPEN_BASE_URL?.trim(),
  },
});

const beforeMiddleware = createMiddleware({
  name: 'beforeMiddleware',
  stateSchema: z.object({
    modelCallCount: z.number().default(0),
  }),
  beforeAgent: async (state) => {
    console.log('beforeMiddleware-messages', state.messages.length);
    return state;
  },
  beforeModel: async (state) => {
    console.log('beforeMiddleware-modelCallCount', state.modelCallCount);
    return { modelCallCount: state.modelCallCount + 1 };
  },
  afterAgent: async (state) => {
    console.log('afterAgent-modelCallCount', state.modelCallCount);
    return state;
  },
  afterModel: async (state) => {
    console.log('afterMiddleware', state.messages.length);
    return state;
  },
});

const addContextMiddleware = createMiddleware({
  name: 'addContextMiddleware',
  wrapModelCall: async (request, handler) => {
    console.log('wrapModelCall', request.messages.length);
    return handler({
      ...request,
      systemMessage: request.systemMessage.concat('\n\n请用一句话简单回答'),
    });
  },
});

const blockedContentMiddleware = createMiddleware({
  name: 'BlockedContentMiddleware',
  beforeModel: {
    canJumpTo: ['end'],
    hook: (state) => {
      console.log('hook', state.messages.length);
      const text = state.messages.at(-1)?.content ?? '';
      const isBlocked = String(text).includes('blocked');
      if (isBlocked) {
        return {
          jumpTo: 'end',
          messages: [new AIMessage('The content is blocked')],
        };
      }
    },
  },
});

const agent = createAgent({
  model,
  tools: [],
  systemPrompt: 'You are a helpful assistant.',
  middleware: [
    beforeMiddleware,
    addContextMiddleware,
    blockedContentMiddleware,
  ],
});

const megs = ['请说出新疆的景点和美食', '这句话包含blocked，请回答'];
for (const meg of megs) {
  const result = await agent.invoke({
    messages: [new HumanMessage(meg)],
  });
  console.log(result);
}
