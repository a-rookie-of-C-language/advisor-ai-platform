export interface RagDocument {
  id: number;
  fileName: string;
  fileType?: string | null;
  fileSize?: number | null;
  status?: string | null;
  createdAt?: string | null;
}
