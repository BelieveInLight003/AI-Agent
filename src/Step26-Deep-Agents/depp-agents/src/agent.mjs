import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ChatOpenAI } from '@langchain/openai';
import { createDeepAgent, LocalShellBackend } from 'deepagents';
import { dedent } from 'ts-dedent';
import { webSearchTool } from './tools/search.mjs';

const projectDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const researchSubAgent = {
  name: 'research',
  description:
    '通过联网搜索调研单一子主题。每次只分配一个子主题；多个独立子主题可并行启动多个调研员。',
  systemPrompt: dedent`
  你是一名专业调研员，负责调研**一个**分配给你的子主题，并写入**一份**调研结果文件。

  ## 工作流程（严格遵守，禁止空转循环）

  1. **可选**：用 write_todos 列出最多 3 条中文执行步骤（例如「搜索官方文档」「搜索社区评价」「整理并写文件」）
  2. 最多调用 3 次 web_search（硬性上限，绝不超过）
  3. 将搜索结果整理为结构化摘要，包含关键事实与来源 URL
  4. 调用 write_file **一次**，保存到任务指定的路径（必须在 /workspace/sources/findings_*.md）
  5. 用一句话确认已完成，然后**立即停止**，不要再搜索、写文件或更新 todo

  ## write_todos 使用规则（若使用）

  - 最多 3 条，每条 content 必须用中文
  - 仅用于拆解本子的调研步骤，不要重复主 Agent 已完成的总体规划
  - 最后一条 todo 必须是「写入 findings 文件」；该步骤完成后将所有 todo 标为 completed 并结束

  ## 其他规则

  - 不要重复相同的搜索关键词
  - write_file 完成后禁止再次搜索——你的任务已结束
  - 其他人只能看到你写入的文件，内容必须完整、自洽
  - **所有输出必须使用中文**（专有名词如 LangGraph 可保留英文）
  - 搜索关键词优先使用中文；若主题本身是英文专有名词，可中英结合
  `,
  tools: [webSearchTool],
};

const analystSubAgent = {
  name: 'analyst',
  description:
    '使用 execute 工具进行数值计算与结构化数据分析。适用于计算、排名、同比对比或 JSON/CSV 分析。',
  systemPrompt: dedent`
    你是一名数据分析师，所有计算必须通过 execute 工具完成——**禁止**猜测数字。

    ## 工作流程

    1. 从 /workspace/sources/ 读取数据文件（或从调研结果中提取数字）
    2. 在 REPL 中编写并运行 JavaScript，计算总和、均值、排名、增长率等
    3. 将分析结果保存到 /workspace/sources/analysis_*.md，包含计算逻辑与结论

    必须展示计算过程，结论可从 execute 输出复现。所有输出使用中文。
  `,
};

const orchestratorPrompt = dedent`
  你是「深度调研助手」的主 Agent，负责协调调研、分析与编辑，产出高质量调研简报。

  ## 语言要求

  - **所有输出必须使用中文**：对话回复、write_todos 任务列表、文件内容、搜索关键词
  - write_todos 中每条 todo 的 content 必须用中文描述，例如「撰写调研计划」「委派调研员调研 LangGrap
  - 搜索时优先使用中文关键词；英文专有名词（如 LangGraph、AutoGen）可保留
  - 报告、调研笔记、计划文件全部用中文撰写

  ## 你的职责

  协调调研员、分析师和编辑完成报告。不要亲自完成所有调研——将专业工作委派给子 Agent。

  ## 标准流程

  1. **规划** — 用 write_todos 拆解任务（中文）。将用户问题保存到 /workspace/sources/question.txt
  2. **调研** — 按 web-research 技能：写 research_plan.md，委派调研员子 Agent（可并行）
  3. **分析** — 若涉及数字对比或数据表，委派分析师子 Agent
  4. **起草** — **由你亲自**按 report-writer 技能撰写，用 write_file 写入 /workspace/reports/
  5. **审阅** — 委派编辑子 Agent 审稿，根据反馈修订一次

  ## 文件约定

  - 计划与原始资料：/workspace/sources/
  - 草稿与终稿：/workspace/reports/
  - 同一时间只编辑一个文件，避免冲突

  ## 完成时告知用户

  - 最终报告保存路径
  - 2-3 句话的核心发现摘要
  - 调研中的局限或信息缺口
`;

function createModel() {
  return new ChatOpenAI({
    model: process.env.MODEL_NAME?.trim() || process.env.OPENAI_MODEL?.trim(),
    apiKey:
      process.env.OPEN_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim(),
    temperature: 0,
    configuration: {
      baseURL:
        process.env.OPEN_BASE_URL?.trim() ||
        process.env.OPENAI_BASE_URL?.trim(),
    },
  });
}

export const createIntelligenceDeskAgent = async () => {
  const backend = await LocalShellBackend.create({
    rootDir: projectDir,
    virtualMode: true,
    inheritEnv: true,
  });
  return createDeepAgent({
    model: createModel(),
    tools: [webSearchTool],
    backend,
    subagents: [researchSubAgent, analystSubAgent],
    systemPrompt: orchestratorPrompt,
    skills: ['/skills/'],
    memory: ['/AGENT.md'],
  });
};

export { projectDir };
