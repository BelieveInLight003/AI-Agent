import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('kh_document')
export class DocumentEntity {
  /** 雪花 ID，对应列 id */
  @PrimaryColumn({ type: 'bigint', name: 'id' })
  documentId: string;

  @Column()
  title: string;

  /** MongoDB 返回的正文 ID，对应列 content_id */
  @Column({ name: 'content_id' })
  contentId: string;

  @Column({ type: 'varchar', nullable: true })
  summary: string;

  @Column({ type: 'varchar', nullable: true })
  tags: string;

  @Column({ type: 'smallint', default: 1 })
  status: number;

  @Column({ name: 'is_public', default: false })
  isPublic: boolean;

  @Column({ type: 'varchar', nullable: true })
  remark: string;

  @Column({ type: 'bigint', name: 'category_id', nullable: true })
  categoryId: string;

  @Column({ type: 'bigint', name: 'team_id', nullable: true })
  teamId: string;

  @Column({ type: 'bigint', name: 'author_id', nullable: true })
  authorId: string;

  @Column({ type: 'bigint', name: 'create_by', nullable: true })
  createBy: string;

  @Column({ type: 'bigint', name: 'update_by', nullable: true })
  updateBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'deleted', default: false })
  delete: boolean;
}
