export interface IStartAttempt {
  testId: string;
}

export interface ISaveAnswer {
  questionId: string;
  selectedOptions: string[]; // option ids
  timeSpentSeconds?: number;
}

export interface ISubmitAttempt {
  // empty body – we calculate from DB
}