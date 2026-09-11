import { Inject, Module, OnApplicationBootstrap } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiModule } from './ai/ai.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { User } from './users/entities/user.entity';
import { CronExpression, ScheduleModule } from '@nestjs/schedule';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { JobModule } from './job/job.module';
import { Job } from './job/entities/job.entity';
export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    AiModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get('MAILER_HOST'),
          port: Number(configService.get('MAILER_PORT')),
          secure: configService.get('MAILER_SECURE') === 'true',
          auth: {
            user: configService.get('MAILER_USER'),
            pass: configService.get('MAILER_PASS'),
          },
        },
        defaults: {
          from: configService.get('MAILER_FROM'),
        },
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DATABASE_HOST'),
        port: Number(configService.get('DATABASE_PORT')),
        username: configService.get('DATABASE_USERNAME'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        entities: [User, Job],
        synchronize: true,
      }),
    }),
    UsersModule,
    ScheduleModule.forRoot({}),
    JobModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnApplicationBootstrap {
  @Inject(SchedulerRegistry)
  private readonly schedulerRegistry: SchedulerRegistry;

  async onApplicationBootstrap() {
    const cronJob = new CronJob(CronExpression.EVERY_SECOND, () => {
      console.log('cronJob');
    });
    this.schedulerRegistry.addCronJob('cronJob1', cronJob);
    cronJob.start();

    setTimeout(() => {
      this.schedulerRegistry.deleteCronJob('cronJob1');
      console.log('cronJob1 deleted');
    }, 500);

    const timeIntervalJob = setInterval(() => {
      console.log('timeIntervalJob');
    }, 500);
    this.schedulerRegistry.addInterval('timeIntervalJob', timeIntervalJob);
    setTimeout(() => {
      this.schedulerRegistry.deleteInterval('timeIntervalJob');
      console.log('timeIntervalJob deleted');
    }, 2000);
  }
}
