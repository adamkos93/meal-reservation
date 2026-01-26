export interface MealCancellation {
  id: string;
  childId: string;
  date: string; // ISO date string YYYY-MM-DD
  createdAt: string;
}

export interface CreateCancellationDto {
  childId: string;
  date: string;
}
