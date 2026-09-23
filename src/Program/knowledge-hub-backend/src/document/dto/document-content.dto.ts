/** 对应 MongoDB DocumentContent */
export class DocumentContentDto {
  id: string;
  documentId: string;
  delete: boolean;
  title: string;
  content: string;
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
}
