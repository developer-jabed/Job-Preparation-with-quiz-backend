// modules/extracted-question/extracted-question.interface.ts
import type { ReviewStatus } from "@prisma/client";

export interface IUpdateExtractedQuestionStatus {
  status: ReviewStatus;
  reviewNote?: string | null;
}

export interface IApproveExtractedQuestion {
  subjectId?: string;
  categoryId?: string | null;
  topicId?: string | null;
  tagIds?: string[];
}