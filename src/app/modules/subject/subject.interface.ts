export type ISubjectFilterRequest = {
  searchTerm?: string;
  isActive?: string | boolean;
};

export type ICreateSubject = {
  name: string;
  nameHi?: string;
  slug: string;
  description?: string;
  icon?: string;
  order?: number;
  isActive?: boolean;
};

export type IUpdateSubject = Partial<ICreateSubject>;