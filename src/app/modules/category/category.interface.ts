export type ICategoryFilterRequest = {
  searchTerm?: string;
  isActive?: string | boolean;
  subjectId?: string;
};

export type ICreateCategory = {
  name: string;
  nameHi?: string;
  slug: string;
  description?: string;
  order?: number;
  isActive?: boolean;
  subjectId: string;
};

export type IUpdateCategory = Partial<Omit<ICreateCategory, "subjectId">>;