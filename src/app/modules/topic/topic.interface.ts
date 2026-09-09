export type ITopicFilterRequest = {
  searchTerm?: string;
  isActive?: string | boolean;
  categoryId?: string;
};

export type ICreateTopic = {
  name: string;
  nameHi?: string;
  slug: string;
  description?: string;
  order?: number;
  isActive?: boolean;
  categoryId: string;
};

export type IUpdateTopic = Partial<Omit<ICreateTopic, "categoryId">>;