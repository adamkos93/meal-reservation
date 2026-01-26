export interface AppSettings {
  id: string;
  globalMealRate: number; // PLN per meal
  deadlineHour: number; // Hour of deadline (default 17)
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'app-settings',
  globalMealRate: 8.5,
  deadlineHour: 17
};
