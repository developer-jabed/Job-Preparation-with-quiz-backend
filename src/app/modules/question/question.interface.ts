import type { Difficulty, QuestionType } from "@prisma/client";

export interface ICreateOption {
  text: string;
  textHi?: string;
  isCorrect: boolean;
  order?: number;
}

export interface ICreateQuestion {
  questionText: string;
  questionTextHi?: string;
  questionType?: QuestionType;
  difficulty?: Difficulty;
  marks?: number;
  negativeMarks?: number;
  explanation?: string;
  explanationHi?: string;
  isPreviousYear?: boolean;
  year?: number | null;
  examName?: string | null;
  source?: string | null;
  subjectId: string;
  categoryId?: string | null;
  topicId?: string | null;
  options: ICreateOption[];
  tagIds?: string[];
}

export interface IUpdateQuestion {
  questionText?: string;
  questionTextHi?: string;
  questionType?: QuestionType;
  difficulty?: Difficulty;
  marks?: number;
  negativeMarks?: number;
  explanation?: string;
  explanationHi?: string;
  isPreviousYear?: boolean;
  year?: number | null;
  examName?: string | null;
  source?: string | null;
  subjectId?: string;
  categoryId?: string | null;
  topicId?: string | null;
  isActive?: boolean;
  options?: ICreateOption[];
  tagIds?: string[];
}

export interface IQuestionFilterRequest {
  searchTerm?: string;
  subjectId?: string;
  categoryId?: string;
  topicId?: string;
  difficulty?: Difficulty;
  questionType?: QuestionType;
  isPreviousYear?: string | boolean;
  examName?: string;
  isActive?: string | boolean;
  year?: string | number;
}