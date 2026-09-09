import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module';
import type { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  app.use((_req: Request, res: Response, next: NextFunction) => {
    const writeHead = res.writeHead.bind(res);
    res.writeHead = ((...args: Parameters<Response['writeHead']>) => {
      for (const arg of args) {
        if (arg && typeof arg === 'object' && !Array.isArray(arg) && arg['Content-Type'] === 'text/event-stream') {
          arg['Content-Type'] = 'text/event-stream; charset=utf-8';
        }
      }
      return writeHead(...args);
    }) as Response['writeHead'];
    next();
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
