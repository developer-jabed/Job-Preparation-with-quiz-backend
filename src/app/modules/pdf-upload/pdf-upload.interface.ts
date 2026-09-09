import type { PdfStatus } from "@prisma/client";

export interface ICreatePdfUpload {
  subjectId?: string;
  examName?: string;
  year?: number;
}

export interface IUpdatePdfStatus {
  status: PdfStatus;
  errorMessage?: string;
}