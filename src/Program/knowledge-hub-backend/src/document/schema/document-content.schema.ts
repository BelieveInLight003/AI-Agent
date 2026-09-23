import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DocumentContentDocument = HydratedDocument<DocumentContent>;

@Schema({ timestamps: true, id: false })
export class DocumentContent {
  /** 雪花 ID，同时作为 PostgreSQL 的 contentId */
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  documentId: string;

  @Prop({ type: Boolean, default: false })
  delete: boolean;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop()
  summary: string;

  @Prop()
  tags: string;

  @Prop({ default: 1 })
  status: number;

  @Prop({ type: Boolean, default: false })
  isPublic: boolean;

  @Prop()
  remark: string;

  @Prop()
  categoryId: string;

  @Prop()
  teamId: string;

  @Prop()
  authorId: string;

  @Prop()
  createBy: string;

  @Prop()
  updateBy: string;
}

export const DocumentContentSchema =
  SchemaFactory.createForClass(DocumentContent);
