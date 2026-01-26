export interface AppSettings {
  id: string;
  globalMealRate: number; // PLN per day (za dzień wyżywienia)
  deadlineHour: number; // Hour of deadline (default 17)
  adminPin: string; // PIN administratora
  showPaymentPanel: boolean; // Feature flag - czy pokazywać panel płatności rodzicom
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'app-settings',
  globalMealRate: 8.5,
  deadlineHour: 17,
  adminPin: '1234',
  showPaymentPanel: true
};
