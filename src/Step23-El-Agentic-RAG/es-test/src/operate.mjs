import { Client } from '@elastic/elasticsearch';

const client = new Client({
  node: 'http://localhost:9200',
});

const INDEX_NAME = 'travel_journal';

async function createDoc() {
  const now = new Date().toISOString();
  const res = await client.index({
    index: INDEX_NAME,
    document: {
      note_title: '夜跑复盘',
      note_body: '今天夜跑 5 公里，配速稳定，结束后做了拉伸。',
      tags: ['运动', '夜跑'],
      mood: 'focused',
      priority: 2,
      created_at: now,
      updated_at: now,
    },
    refresh: true,
  });

  console.log('新增成功, ID =', res._id);
  return res._id;
}

async function getDoc(id) {
  const res = await client.get({
    index: INDEX_NAME,
    id,
  });

  console.log('查询成功:', res._source);
  return res._source;
}

async function updateDoc(id) {
  const res = await client.update({
    index: INDEX_NAME,
    id,
    doc: {
      note_title: '夜跑复盘（已更新）',
      mood: 'relaxed',
      priority: 1,
      updated_at: new Date().toISOString(),
    },
    refresh: true,
  });

  console.log('更新成功, ID =', res._id);
  return res._id;
}

async function deleteDoc(id) {
  const res = await client.delete({
    index: INDEX_NAME,
    id,
    refresh: true,
  });

  console.log('删除成功, ID =', res._id);
  return res._id;
}

async function main() {
  const id = await createDoc();
  // await getDoc(id);
  await updateDoc(id);
  // await deleteDoc(id);
}

main();
