/** 对应 PostgreSQL DocumentEntity */
export class DocumentDto {
  documentId: string;
  title: string;
  contentId: string;
  summary: string;
  tags: string;
  status: number;
  isPublic: boolean;
  remark: string;
  categoryId: string;
  teamId: string;
  authorId: string;
  createBy: string;
  updateBy: string;
  createAt: Date;
  updatedAt: Date;
  delete: boolean;
}
