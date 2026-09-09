export interface ICreateReport {
  questionId: string;
  reason: string;
  description?: string;
}

export type ReportStatus = "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_EDIT";