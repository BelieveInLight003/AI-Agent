import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { Book } from './entities/book.entity';

@Injectable()
export class BookService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
  ) {}

  create(createBookDto: CreateBookDto) {
    const book = this.bookRepository.create({
      ...createBookDto,
      publishedAt: createBookDto.publishedAt
        ? new Date(createBookDto.publishedAt)
        : new Date(),
    });
    return this.bookRepository.save(book);
  }

  findAll() {
    return this.bookRepository.find();
  }

  async findOne(id: number) {
    const book = await this.bookRepository.findOneBy({ id });
    if (!book) {
      throw new NotFoundException(`Book #${id} not found`);
    }
    return book;
  }

  async update(id: number, updateBookDto: UpdateBookDto) {
    await this.findOne(id);
    await this.bookRepository.update(id, {
      ...updateBookDto,
      ...(updateBookDto.publishedAt
        ? { publishedAt: new Date(updateBookDto.publishedAt) }
        : {}),
    });
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.bookRepository.softDelete(id);
    return { id, deleted: true };
  }
}
