import 'dotenv/config';
import { MemoryClient } from 'mem0ai';

const USER_ID = 'demo_user';

async function main() {
  const client = new MemoryClient({
    apiKey: process.env.MEM0_API_KEY,
  });

  const conversations = [
    { role: 'user', content: '我是素食主义者，而且对坚果过敏。' },
    { role: 'assistant', content: '好的，我会记住你的饮食偏好。' },
    { role: 'user', content: '我住在北京，平时喜欢跑步。' },
    { role: 'assistant', content: '已记录：北京、爱好跑步。' },
  ];

  // const added = await client.add(conversations, { userId: USER_ID });
  // console.log('----------added----------', added);

  // const firstMemoryId = added?.[0]?.id;

  // const memory = await client.get(firstMemoryId);
  // console.log('----------memory----------', memory);

  // const searchResults = await client.search('用户的饮食限制是什么，中文回答', {
  //   filters: { user_id: USER_ID },
  //   topK: 5,
  // });
  // console.log('----------searchResults----------', searchResults);

  // const allMemories = await client.getAll({
  //   filters: { user_id: USER_ID },
  // });
  // console.log('----------allMemories----------', allMemories);

  // if (allMemories.results?.length > 0) {
  //   const updated = await client.update(allMemories.results[0].id, {
  //     text: '用户已经更新了饮食限制。',
  //   });
  //   console.log('----------updated----------', updated);

  //   const history = await client.history(allMemories.results[0].id);
  //   console.log('----------history----------', history);
  // }

  const deleted = await client.deleteAll({ userId: USER_ID });
  console.log('----------deleted----------', deleted);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
