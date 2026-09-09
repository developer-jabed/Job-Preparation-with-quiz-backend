export type ILearnerFilterRequest = {
  searchTerm?: string;
  email?: string;
  phone?: string;
  isActive?: boolean | string;
  isEmailVerified?: boolean | string;
};