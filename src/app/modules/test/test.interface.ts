import type { TestType } from "@prisma/client";

export interface ICreateTest {
  title: string;
  titleHi?: string;
  slug?: string;
  description?: string;
  testType?: TestType;
  durationMinutes: number;
  passingMarks?: number;
  isFree?: boolean;
  isActive?: boolean;
  isFeatured?: boolean;
  instructions?: string;
  subjectId?: string | null;
  categoryId?: string | null;
  questionIds: string[]; // order matters
}

export interface IUpdateTest {
  title?: string;
  titleHi?: string;
  description?: string;
  testType?: TestType;
  durationMinutes?: number;
  passingMarks?: number;
  isFree?: boolean;
  isActive?: boolean;
  isFeatured?: boolean;
  instructions?: string;
  subjectId?: string | null;
  categoryId?: string | null;
  questionIds?: string[];
}

export interface ITestFilterRequest {
  searchTerm?: string;
  testType?: TestType;
  subjectId?: string;
  categoryId?: string;
  isFree?: string | boolean;
  isActive?: string | boolean;
  isFeatured?: string | boolean;
}