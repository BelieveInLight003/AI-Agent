import { Controller, Get, Query, Sse, MessageEvent } from '@nestjs/common';
import { AiService } from './ai.service';
import { Observable } from 'rxjs';
import { from, map } from 'rxjs';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('chat')
  async chat(@Query('query') query: string) {
    const answer = await this.aiService.runAgentWithTools(query);
    return {
      answer,
    };
  }

  @Sse('chat/stream')
  stream(@Query('query') query: string): Observable<MessageEvent> {
    return from(this.aiService.runAgentByStream(query)).pipe(
      map((chunk) => ({
        data: chunk,
      })),
    );
  }
}
