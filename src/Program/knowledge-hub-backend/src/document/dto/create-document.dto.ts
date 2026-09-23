export class CreateDocumentDto {
  title: string;
  content: string;
  summary?: string;
  tags?: string;
  status?: number;
  isPublic?: boolean;
  remark?: string;
  categoryId?: string;
  teamId?: string;
  authorId?: string;
  createBy?: string;
}
