import 'dotenv/config';
import { MemoryClient } from 'mem0ai';

const USER_ID = 'mem0-test-user';
const SESSION_ID = 'mem0-test-session';
const AGENT_ID = 'mem0-test-agent';

const addUserMemory = async (client) => {
  const conversations = [
    { role: 'user', content: '我是素食主义者，而且对坚果过敏。' },
    { role: 'assistant', content: '好的，我会记住你的饮食偏好。' },
  ];

  const added = await client.add(conversations, {
    userId: USER_ID,
  });
  console.log('----------added----------users memory----------', added);
};

const searchUserMemory = async (client) => {
  const searchResults = await client.search('用户的饮食限制是什么，中文回答', {
    filters: { user_id: USER_ID },
    topK: 5,
  });
  console.log(
    '----------searchResults----------users memory----------',
    searchResults,
  );

  const listed = await client.getAll({
    filters: { user_id: USER_ID },
    pageSize: 5,
  });
  console.log('----------listed----------users memory----------', listed);
};

const addSessionMemory = async (client) => {
  const messages = [
    {
      role: 'user',
      content: '这次聊天先帮我把季度总结的大纲列出来，重点写 Q1 的项目复盘。',
    },
    {
      role: 'assistant',
      content: '明白，我们先围绕 Q1 项目复盘整理季度总结大纲。',
    },
  ];
  const added = await client.add(messages, {
    userId: USER_ID,
    runId: SESSION_ID,
  });
  console.log('----------added----------session memory----------', added);
};

const addAgentMemory = async (client) => {
  const messages = [
    {
      role: 'user',
      content: '你现在是旅行规划助手，回答时多给具体建议和备选方案。',
    },
    {
      role: 'assistant',
      content: '好的，我会以旅行规划助手的身份，提供具体建议和备选方案。',
    },
  ];
  const added = await client.add(messages, {
    agentId: AGENT_ID,
  });
  console.log('----------added----------agent memory----------', added);
};

const searchSessionMemory = async (client) => {
  const searchResults = await client.search('这次聊天要整理什么大纲', {
    filters: { run_id: SESSION_ID },
    topK: 5,
  });
  console.log(
    '----------searchResults----------session memory----------',
    searchResults,
  );
  const listed = await client.getAll({
    filters: { run_id: SESSION_ID },
    pageSize: 5,
  });
  console.log('----------listed----------session memory----------', listed);
};

const searchAgentMemory = async (client) => {
  const searchResults = await client.search('你现在是什么助手', {
    filters: { agent_id: AGENT_ID },
    topK: 5,
  });
  console.log(
    '----------searchResults----------agent memory----------',
    searchResults,
  );
  const listed = await client.getAll({
    filters: { agent_id: AGENT_ID },
    pageSize: 5,
  });
  console.log('----------listed----------agent memory----------', listed);
};

const deleteUserMemory = async (client) => {
  const deleted = await client.deleteAll({ userId: USER_ID });
  console.log('----------deleted----------users memory----------', deleted);
};

const deleteSessionMemory = async (client) => {
  const deleted = await client.deleteAll({ runId: SESSION_ID });
  console.log('----------deleted----------session memory----------', deleted);
};

const deleteAgentMemory = async (client) => {
  const deleted = await client.deleteAll({ agentId: AGENT_ID });
  console.log('----------deleted----------agent memory----------', deleted);
};

async function main() {
  const client = new MemoryClient({
    apiKey: process.env.MEM0_API_KEY,
  });

  if (process.argv[2] === 'add') {
    await addUserMemory(client);
    await addSessionMemory(client);
    await addAgentMemory(client);
  } else if (process.argv[2] === 'search') {
    await searchUserMemory(client);
    await searchSessionMemory(client);
    await searchAgentMemory(client);
  } else if (process.argv[2] === 'delete') {
    await deleteUserMemory(client);
    await deleteSessionMemory(client);
    await deleteAgentMemory(client);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
