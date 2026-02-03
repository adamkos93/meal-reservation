export interface Holiday {
  date: string; // Format YYYY-MM-DD
  name: string; // Nazwa dnia wolnego (np. "Boże Narodzenie")
}

export interface MealRatePeriod {
  id: string;
  startMonth: string; // Format YYYY-MM (miesiąc od którego obowiązuje stawka)
  rate: number; // PLN per day
}

export interface AppSettings {
  id: string;
  globalMealRate: number; // PLN per day (za dzień wyżywienia)
  deadlineHour: number; // Hour of deadline (default 17)
  adminPin: string; // PIN administratora
  showPaymentPanel: boolean; // Feature flag - czy pokazywać panel płatności rodzicom
  holidays: Holiday[]; // Dni wolne (święta)
  mealRatePeriods?: MealRatePeriod[]; // Opcjonalne zakresy czasowe z innymi stawkami
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'app-settings',
  globalMealRate: 8.5,
  deadlineHour: 17,
  adminPin: '1234',
  showPaymentPanel: true,
  holidays: [],
  mealRatePeriods: []
};
