import 'dotenv/config';
import { PromptTemplate, FewShotPromptTemplate } from '@langchain/core/prompts';
import { LengthBasedExampleSelector } from '@langchain/core/example_selectors';

const examplePrompt = PromptTemplate.fromTemplate(`
{user_requirement}
{report_snippet}
`);

const examplesData = [
  {
    user_requirement: '本周主要在做基础设施稳定性治理，想突出风险控制。',
    report_snippet: [
      '核心链路共处理 P1 级别故障 1 起，P2 故障 2 起，均在 SLA 内完成处置；',
      '对 5 个高风险接口补充了限流与熔断策略，覆盖 80% 高峰流量；',
      '新增 6 条针对延迟抖动的告警规则，减少漏报风险。',
    ].join('\n'),
  },
  {
    user_requirement: '偏向对外展示成果，多写一些亮点和业务价值。',
    report_snippet: [
      '上线「实时订单看板」，支持业务实时查看转化漏斗；',
      '打通埋点 → 数据仓库 → 实时服务的闭环，支撑后续精细化运营；',
      '完成 2 场内部分享，会后收到 15 条正向反馈。',
    ].join('\n'),
  },
  {
    user_requirement:
      '只是想要一个非常简短的周报，两三句话就够了，主要告诉老板「一切稳定」即可。',
    report_snippet:
      '本周整体运行平稳，未发生重大事故，核心指标均在预期范围内。',
  },
  {
    user_requirement:
      '需要一份比较详细的技术周报，涵盖研发、测试、上线、监控等各个环节，篇幅可以略长。',
    report_snippet: [
      '研发：完成结算服务重构第一阶段，拆分出 3 个独立子服务，接口延迟较旧架构下降约 35%；',
      '测试：补齐 20+ 条关键路径自动化用例，整体用例数量提升到 180 条，回归时间从 2 天缩短到 0.5 天；',
      '上线：采用灰度 + Canary 策略，期间监控到 2 次轻微指标抖动，均在 5 分钟内回滚处理；',
      '监控：新增 8 条核心告警和 3 个 SLO 指标，后续会结合值班反馈继续收敛噪音告警。',
    ].join('\n'),
  },
];

async function buildPrompt(maxLength) {
  const exampleSelector = await LengthBasedExampleSelector.fromExamples(
    examplesData,
    {
      examplePrompt,
      maxLength, // 注意：是 maxLength，不是 maxExamples
      getTextLength: (text) => text.length,
    },
  );

  const selected = await exampleSelector.selectExamples({
    user_question: 'xxxxxxxx',
  });

  const fewShootPrompt = new FewShotPromptTemplate({
    exampleSelector,
    examplePrompt,
    prefix: `You are a helpful assistant that generates technical reports. {user_question}`,
    suffix:
      '\n\n现在请根据上面的示例风格，为下面这个场景写一份新的周报：\n场景描述: {user_question}\n请输出一份适合发给老板和团队同步的 Markdown 周报草稿。',
    inputVariables: ['user_question'],
  });

  const prompt = await fewShootPrompt.format({
    user_question: 'xxxxxxxx',
  });

  return { selectedCount: selected.length, prompt };
}

// 对比：额度大 vs 额度小
const large = await buildPrompt(700);
const small = await buildPrompt(200);

console.log('===== maxLength = 2000 =====');
console.log(`选中示例数: ${large.selectedCount}`);
console.log(large.prompt);

console.log('\n===== maxLength = 120 =====');
console.log(`选中示例数: ${small.selectedCount}`);
console.log(small.prompt);
