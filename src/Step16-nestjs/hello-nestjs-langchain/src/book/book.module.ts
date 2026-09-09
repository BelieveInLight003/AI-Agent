import { Module } from '@nestjs/common';
import { BookService } from './book.service';
import { BookController } from './book.controller';

@Module({
  controllers: [BookController],
  providers: [
    BookService,
    {
      provide: 'BOOK_REPOSITORY',
      useFactory: () => {
        const books = [
          {
            id: 1,
            title: 'Book 1',
            author: 'Author 1',
          },
          {
            id: 2,
            title: 'Book 2',
            author: 'Author 2',
          },
          {
            id: 3,
            title: 'Book 3',
            author: 'Author 3',
          },
          {
            id: 4,
            title: 'Book 4',
            author: 'Author 4',
          },
          {
            id: 5,
            title: 'Book 5',
            author: 'Author 5',
          },
        ];
        return {
          findAll: () => books,
        };
      },
    },
  ],
})
export class BookModule {}
