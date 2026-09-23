import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Model } from 'mongoose';
import { ILike, Repository } from 'typeorm';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
import { DocumentEntity } from './entities/document.entity.js';
import { DocumentContent } from './schema/document-content.schema.js';
import { Snowflake } from './snowflake.js';

const META_FIELDS = [
  'title',
  'summary',
  'tags',
  'status',
  'isPublic',
  'remark',
  'categoryId',
  'teamId',
  'authorId',
  'createBy',
] as const;

@Injectable()
export class DocumentService {
  private readonly snowflake = new Snowflake();

  constructor(
    @InjectModel(DocumentContent.name)
    private readonly contentModel: Model<DocumentContent>,
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
  ) {}

  /** 未传 summary 时，才用正文前 200 字补上 */
  summary(content: string) {
    return (content ?? '').slice(0, 200);
  }

  async create(dto: CreateDocumentDto) {
    const summary = dto.summary ?? this.summary(dto.content);
    const id = this.snowflake.nextId();
    const meta = this.pickMeta({ ...dto, summary });

    const mongoDoc = await this.contentModel.create({
      id,
      documentId: id,
      content: dto.content,
      ...meta,
    });

    const document = this.documentRepo.create({
      documentId: id,
      contentId: String(mongoDoc.id),
      ...meta,
    });
    const saved = await this.documentRepo.save(document);
    return { id: saved.documentId, ...saved };
  }

  async findAll(page = 1, pageSize = 10, title?: string) {
    const current = page > 0 ? page : 1;
    const size = pageSize > 0 ? pageSize : 10;
    const [list, total] = await this.documentRepo.findAndCount({
      where: {
        delete: false,
        ...(title ? { title: ILike(`%${title}%`) } : {}),
      },
      order: { documentId: 'DESC' },
      skip: (current - 1) * size,
      take: size,
    });

    return {
      list: list.map((item) => ({ id: item.documentId, ...item })),
      total,
      page: current,
      pageSize: size,
    };
  }

  async findOne(id: string) {
    const document = await this.documentRepo.findOne({
      where: { documentId: id, delete: false },
    });
    if (!document) {
      throw new NotFoundException(`文档 ${id} 不存在`);
    }

    const mongoDoc = await this.contentModel
      .findOne({ id: document.contentId, delete: false })
      .lean();

    return {
      id: document.documentId,
      ...document,
      content: mongoDoc?.content ?? '',
    };
  }

  async update(id: string, dto: UpdateDocumentDto) {
    const document = await this.documentRepo.findOne({
      where: { documentId: id, delete: false },
    });
    if (!document) {
      throw new NotFoundException(`文档 ${id} 不存在`);
    }

    const changes = this.pickDefined(dto);
    if (dto.content !== undefined) {
      await this.contentModel.updateOne(
        { id: document.contentId },
        { $set: { ...changes, content: dto.content } },
      );
    } else if (Object.keys(changes).length > 0) {
      await this.contentModel.updateOne(
        { id: document.contentId },
        { $set: changes },
      );
    }

    if (Object.keys(changes).length > 0) {
      await this.documentRepo.update({ documentId: id }, changes);
    }
    return this.findOne(id);
  }

  async remove(id: string) {
    const document = await this.documentRepo.findOne({
      where: { documentId: id, delete: false },
    });
    if (!document) {
      throw new NotFoundException(`文档 ${id} 不存在`);
    }

    await this.contentModel.updateOne(
      { id: document.contentId },
      { $set: { delete: true } },
    );
    await this.documentRepo.update({ documentId: id }, { delete: true });
    return { id, documentId: id, delete: true };
  }

  private pickMeta(dto: CreateDocumentDto) {
    return {
      title: dto.title,
      summary: dto.summary,
      tags: dto.tags,
      status: dto.status ?? 1,
      isPublic: dto.isPublic ?? false,
      remark: dto.remark,
      categoryId: dto.categoryId,
      teamId: dto.teamId,
      authorId: dto.authorId,
      createBy: dto.createBy,
    };
  }

  private pickDefined(dto: UpdateDocumentDto) {
    const changes: Record<string, unknown> = {};
    for (const key of [...META_FIELDS, 'updateBy'] as const) {
      if (dto[key] !== undefined) {
        changes[key] = dto[key];
      }
    }
    return changes;
  }
}
