import { Injectable, Inject } from '@nestjs/common';
import { CreateAiDto } from './dto/create-ai.dto';
import { UpdateAiDto } from './dto/update-ai.dto';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import type { Runnable } from '@langchain/core/runnables';

@Injectable()
export class AiService {
  private readonly chain: Runnable;

  constructor(@Inject('CHAT_MODEL') private readonly model: ChatOpenAI) {
    const prompt = PromptTemplate.fromTemplate(
      '根据用户的问题，做2-3句的简短回答即可。用户的问题：{query}',
    );

    this.chain = prompt.pipe(model).pipe(new StringOutputParser());
  }

  async runChain(query: string) {
    return await this.chain.invoke({ query });
  }

  // 异步生成器，async * 用于流式输出
  async *runChainStream(query: string): AsyncGenerator<string> {
    const chunks = await this.chain.stream({ query });
    for await (const chunk of chunks) {
      yield chunk;
    }
  }

  create(createAiDto: CreateAiDto) {
    return 'This action adds a new ai';
  }

  findAll() {
    return `This action returns all ai`;
  }

  findOne(id: number) {
    return `This action returns a #${id} ai`;
  }

  update(id: number, updateAiDto: UpdateAiDto) {
    return `This action updates a #${id} ai`;
  }

  remove(id: number) {
    return `This action removes a #${id} ai`;
  }
}
