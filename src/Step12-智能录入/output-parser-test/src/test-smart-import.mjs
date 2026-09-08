import mysql from 'mysql2/promise';
import { ChatOpenAI } from '@langchain/openai';
import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  name: z.string().describe('姓名'),
  gender: z.string().nullable().describe('性别，男或女'),
  birthDate: z.string().nullable().describe('出生日期，格式 YYYY-MM-DD'),
  company: z.string().nullable().describe('公司'),
  title: z.string().nullable().describe('职位'),
  phone: z.string().nullable().describe('手机号'),
  wechat: z.string().nullable().describe('微信号'),
});

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME,
  apiKey: process.env.OPEN_API_KEY,
  configuration: {
    baseURL: process.env.OPEN_BASE_URL,
  },
  temperature: 0,
});

const structuredModel = model.withStructuredOutput(z.array(schema));

const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'admin',
  port: 3306,
  database: 'hello',
});

const answerQuestion = async (testText) => {
  try {
    await connection.query(`USE hello`);

    const prompt = `
    现在有一段文本，文本中包含多个人的信息，请你根据我提供的信息，将这些人的信息插入到数据库中。
    ${testText}
    
    要求：

    1. 如果文本中包含多个人，请为每个人创建一个对象

    2. 每个对象包含以下字段：
      - 姓名：提取文本中的人名
      - 性别：提取性别信息（男/女）
      - 出生日期：如果能找到具体日期最好，否则根据年龄描述估算（格式：YYYY-MM-DD）
      - 公司：提取公司名称
      - 职位：提取职位/头衔信息
      - 手机号：提取手机号码
      - 微信号：提取微信号

    3. 如果某个字段在文本中找不到，请返回 null

    4. 返回格式必须是一个数组，即使只有一个人也要放在数组中`;

    // 插入 demo 数据
    const insertSql = `
      INSERT INTO friends (
        name,
        gender,
        birth_date,
        company,
        title,
        phone,
        wechat
      ) VALUES (?, ?, ?, ?, ?, ?, ?);
      `;

    // withStructuredOutput 直接返回解析后的数组，没有 .content
    const friends = await structuredModel.invoke(prompt);
    console.log('提取结果: ', friends);

    for (const friend of friends) {
      const [result] = await connection.execute(insertSql, [
        friend.name,
        friend.gender,
        friend.birthDate,
        friend.company,
        friend.title,
        friend.phone,
        friend.wechat,
      ]);
      console.log(`已写入 ${friend.name}，插入 ID: ${result.insertId}`);
    }
  } catch (error) {
    console.error('Error: ', error);
  } finally {
    await connection.end();
  }
};

const main = async () => {
  const testText = `我最近认识几个朋友，
  第一个朋友是王经理，他是一个产品经理，他的微信是 wangjingli2024，他的手机号是 18612345678, 29岁，在腾讯， 女生;
  第二个朋友是张经理，他是一个产品经理，他的微信是 zhangjingli2024，他的手机号是 18612345679, 30岁，在字节跳动， 男生;
  第三个朋友是李经理，他是一个产品经理，他的微信是 lijingli2024，他的手机号是 18612345680, 31岁，在美团， 男生;
  第四个朋友是赵经理，他是一个产品经理，他的微信是 zhaojingli2024，他的手机号是 18612345681, 32岁，在阿里巴巴， 女生;
  第五个朋友是孙经理，他是一个产品经理，他的微信是 sunjingli2024，他的手机号是 18612345682, 33岁，在腾讯， 男生;
  第六个朋友是周经理，他是一个产品经理，他的微信是 zhoujingli2024，他的手机号是 18612345683, 34岁，在字节跳动， 女生;
  第七个朋友是吴经理，他是一个产品经理，他的微信是 wujingli2024，他的手机号是 18612345684, 35岁，在美团， 男生;
  第八个朋友是郑经理，他是一个产品经理，他的微信是 zhengjingli2024，他的手机号是 18612345685, 36岁，在阿里巴巴， 女生;
  第九个朋友是王经理，他是一个产品经理，他的微信是 wangjingli2024，他的手机号是 18612345686, 37岁，在腾讯， 男生;
  第十个朋友是张经理，他是一个产品经理，他的微信是 zhangjingli2024，他的手机号是 18612345687, 38岁，在字节跳动， 女生;
  第十一个朋友是李经理，他是一个产品经理，他的微信是 lijingli2024，他的手机号是 18612345688, 39岁，在美团， 男生;
  `;
  await answerQuestion(testText);
};

main();
