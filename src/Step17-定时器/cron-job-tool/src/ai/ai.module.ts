import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { AiUserService } from './ai.user.service';
import { z } from 'zod';
import { tool } from '@langchain/core/tools';
import { MailerService } from '@nestjs-modules/mailer';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';

@Module({
  imports: [UsersModule],
  controllers: [AiController],
  providers: [
    AiService,
    AiUserService,
    {
      provide: 'CHAT_MODEL',
      useFactory: (configService: ConfigService) => {
        return new ChatOpenAI({
          model: configService.get('MODEL_NAME'),
          temperature: 0,
          apiKey: configService.get('OPEN_API_KEY'),
          configuration: {
            baseURL: configService.get('OPEN_BASE_URL'),
          },
        });
      },
      inject: [ConfigService],
    },
    {
      provide: 'QUERY_USER_TOOL',
      useFactory: (userService: AiUserService) => {
        const userInfoArgSchema = z.object({
          userId: z.string().describe('The ID of the user to query'),
        });

        return tool(
          async ({ userId }: { userId: string }) => {
            const userInfo = userService.getUserInfo(userId);
            if (!userInfo) {
              return `User with ID ${userId} not found`;
            }
            return JSON.stringify(userInfo);
          },
          {
            name: 'query_user_info',
            description: 'Query the user info',
            schema: userInfoArgSchema,
          },
        );
      },
      inject: [AiUserService],
    },
    {
      provide: 'SEND_EMAIL_TOOL',
      inject: [ConfigService, MailerService],
      useFactory: (
        configService: ConfigService,
        mailerService: MailerService,
      ) => {
        const sendEmailArgSchema = z.object({
          to: z.string().describe('The email address to send the email to'),
          subject: z.string().describe('The subject of the email'),
          text: z.string().optional().describe('The body of the email'),
          html: z.string().optional().describe('The HTML content of the email'),
        });
        return tool(
          async (args: z.infer<typeof sendEmailArgSchema>) => {
            const { to, subject, text, html } = args;
            const from = (
              configService.get<string>('MAILER_FROM') ??
              configService.get<string>('MAILER_USER') ??
              ''
            ).trim();

            await mailerService.sendMail({
              to,
              subject,
              text: text ?? 'None Text provided',
              html: html ?? 'None HTML provided',
              from,
            });

            return `Email sent successfully to ${to}, subject: ${subject}`;
          },
          {
            name: 'send_email',
            description:
              '发送邮件。用户要求把查询结果发到邮箱时必须调用本工具，正文要包含查到的用户信息。',
            schema: sendEmailArgSchema,
          },
        );
      },
    },
    {
      provide: 'WEB_SEARCH_TOOL',
      useFactory: (configService: ConfigService) => {
        const webSearchArgSchema = z.object({
          query: z.string().describe('The query to search the web'),
          count: z
            .number()
            .min(1)
            .max(10)
            .optional()
            .default(5)
            .describe('The number of results to return'),
        });

        return tool(
          async (args: z.infer<typeof webSearchArgSchema>) => {
            const { query, count } = args;
            const webUrl = 'https://api.bochaai.com/v1/web-search';
            const apiKey = configService.get<string>('BO_CHA_API_KEY')?.trim();
            const body = {
              query,
              freshness: 'noLimit',
              summary: true,
              count: count || 10,
            };
            const response = await fetch(webUrl, {
              method: 'POST',
              body: JSON.stringify(body),
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
              },
            });
            const raw = await response.text();
            if (!response.ok) {
              return `web_search failed: ${response.status} ${raw.slice(0, 500)}`;
            }
            return raw;
          },
          {
            name: 'web_search',
            description: '搜索网络，返回结果',
            schema: webSearchArgSchema,
          },
        );
      },
      inject: [ConfigService],
    },
    {
      provide: 'DB_CRUD_USERS_TOOL',
      inject: [UsersService],
      useFactory: (usersService: UsersService) => {
        const dbUserSchema = z.object({
          action: z
            .enum(['create', 'list', 'get', 'update', 'delete'])
            .describe('The action to perform on the users table'),
          id: z
            .string()
            .optional()
            .describe('用户 id。create/get/update/delete 时需要'),
          name: z.string().optional().describe('用户名。create/update 时需要'),
          email: z
            .string()
            .max(50)
            .optional()
            .describe('邮箱。create/update 时需要'),
        });

        return tool(
          async (input: z.infer<typeof dbUserSchema>) => {
            const { action, id, name, email } = input;
            switch (action) {
              case 'create':
                if (!id || !name || !email) {
                  throw new Error('create 需要 id、name、email');
                }
                return JSON.stringify(
                  await usersService.create({ id, name, email }),
                );
              case 'list':
                return JSON.stringify(await usersService.findAll());
              case 'get':
                if (!id) {
                  throw new Error('get 需要 id');
                }
                return JSON.stringify(await usersService.findOne(id));
              case 'update':
                if (!id) {
                  throw new Error('update 需要 id');
                }
                return JSON.stringify(
                  await usersService.update(id, { name, email }),
                );
              case 'delete':
                if (!id) {
                  throw new Error('delete 需要 id');
                }
                return JSON.stringify(await usersService.remove(id));
            }
          },
          {
            name: 'db_users_crud',
            description: 'Perform CRUD operations on the users table',
            schema: dbUserSchema,
          },
        );
      },
    },
  ],
})
export class AiModule {}
