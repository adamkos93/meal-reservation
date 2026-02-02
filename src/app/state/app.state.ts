import { Injectable, signal, computed, inject } from '@angular/core';
import { Child, MealCancellation, AppSettings, DEFAULT_SETTINGS, Holiday, MealRatePeriod } from '../shared/models';
import { FirestoreService, ChildService, MealService, DateService } from '../core/services';
import { addDays } from 'date-fns';

export interface CalendarDay {
  date: Date;
  dateStr: string;
  isCurrentMonth: boolean;
  isWorkingDay: boolean;
  isToday: boolean;
  isPast: boolean;
  canCancel: boolean;
  cancellations: MealCancellation[];
  isHoliday: boolean;
  holidayName: string | null;
}

export interface CancelledChildInfo {
  id: string;
  nickname: string;
  identifier: string | null;
}

export interface NextWorkingDayInfo {
  date: Date;
  dateStr: string;
  formatted: string;
  cancellationsCount: number;
  cancelledChildren: CancelledChildInfo[];
}

@Injectable({
  providedIn: 'root'
})
export class AppState {
  private storage = inject(FirestoreService);
  private childService = inject(ChildService);
  private mealService = inject(MealService);
  private dateService = inject(DateService);

  // Core state signals
  private readonly _children = signal<Child[]>([]);
  private readonly _cancellations = signal<MealCancellation[]>([]);
  private readonly _settings = signal<AppSettings>(DEFAULT_SETTINGS);
  private readonly _currentYear = signal<number>(new Date().getFullYear());
  private readonly _currentMonth = signal<number>(new Date().getMonth());
  private readonly _selectedDate = signal<string | null>(null);
  private readonly _isLoading = signal<boolean>(true);

  // Public readonly signals
  readonly children = this._children.asReadonly();
  readonly cancellations = this._cancellations.asReadonly();
  readonly settings = this._settings.asReadonly();
  readonly currentYear = this._currentYear.asReadonly();
  readonly currentMonth = this._currentMonth.asReadonly();
  readonly selectedDate = this._selectedDate.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  // Computed values
  readonly activeChildren = computed(() => 
    this._children().filter(c => c.isActive)
  );

  readonly currentMonthName = computed(() => 
    this.dateService.getMonthName(this._currentMonth())
  );

  readonly calendarDays = computed((): CalendarDay[] => {
    const year = this._currentYear();
    const month = this._currentMonth();
    const settings = this._settings();
    const cancellations = this._cancellations();
    const holidays = settings.holidays || [];

    const days = this.dateService.getCalendarGrid(year, month);

    return days.map(date => {
      const dateStr = this.dateService.toISODate(date);
      const dayCancellations = cancellations.filter(c => c.date === dateStr);
      const isHoliday = this.dateService.isHoliday(date, holidays);
      const holidayName = this.dateService.getHolidayName(date, holidays);

      return {
        date,
        dateStr,
        isCurrentMonth: this.dateService.isInMonth(date, year, month),
        isWorkingDay: this.dateService.isWorkingDay(date) && !isHoliday,
        isToday: this.dateService.isToday(date),
        isPast: this.dateService.isPast(date),
        canCancel: this.dateService.canCancelForDate(date, settings.deadlineHour, holidays),
        cancellations: dayCancellations,
        isHoliday,
        holidayName
      };
    });
  });

  readonly workingDaysInCurrentMonth = computed(() => {
    const year = this._currentYear();
    const month = this._currentMonth();
    return this.dateService.getWorkingDaysInMonth(year, month);
  });

  // Computed: Info about the next working day (for dashboard info box)
  readonly nextWorkingDayInfo = computed((): NextWorkingDayInfo | null => {
    const settings = this._settings();
    const cancellations = this._cancellations();
    const children = this._children();
    const holidays = settings.holidays || [];
    const today = new Date();

    // Find the next working day (starting from tomorrow, not today)
    let nextWorkingDay: Date | null = null;
    
    for (let i = 1; i <= 14; i++) {
      const date = addDays(today, i);
      if (this.dateService.isWorkingDayWithHolidays(date, holidays)) {
        nextWorkingDay = date;
        break;
      }
    }

    if (!nextWorkingDay) return null;

    const dateStr = this.dateService.toISODate(nextWorkingDay);
    const dayCancellations = cancellations.filter(c => c.date === dateStr);

    // Map cancellations to child info
    const cancelledChildren: CancelledChildInfo[] = dayCancellations
      .map(c => children.find(child => child.id === c.childId))
      .filter((child): child is Child => child !== undefined)
      .map(child => ({
        id: child.id,
        nickname: child.nickname,
        identifier: child.identifier
      }))
      .sort((a, b) => a.nickname.localeCompare(b.nickname));

    return {
      date: nextWorkingDay,
      dateStr,
      formatted: this.dateService.formatPolish(nextWorkingDay, 'EEEE, d MMMM'),
      cancellationsCount: dayCancellations.length,
      cancelledChildren
    };
  });

  // Initialize state from IndexedDB
  async initialize(): Promise<void> {
    this._isLoading.set(true);
    try {
      await this.storage.initialize();
      await this.refreshAll();
    } finally {
      this._isLoading.set(false);
    }
  }

  // Refresh all data from storage
  async refreshAll(): Promise<void> {
    const [children, cancellations, settings] = await Promise.all([
      this.storage.getAllChildren(),
      this.storage.getAllCancellations(),
      this.storage.getSettings()
    ]);

    this._children.set(children);
    this._cancellations.set(cancellations);
    this._settings.set(settings || DEFAULT_SETTINGS);
  }

  // Children management
  async addChild(nickname: string, identifier?: string, accessCode?: string, startDate?: string | null, endDate?: string | null): Promise<Child> {
    const code = accessCode || nickname.toLowerCase().replace(/\s+/g, '') + Math.random().toString(36).substring(2, 6);
    const child = await this.childService.createChild({ nickname, identifier, accessCode: code, startDate, endDate });
    this._children.update(children => [...children, child]);
    return child;
  }

  async updateChild(id: string, nickname: string, identifier?: string, accessCode?: string, startDate?: string | null, endDate?: string | null): Promise<void> {
    await this.childService.updateChild(id, { nickname, identifier, accessCode, startDate, endDate });
    await this.refreshChildren();
  }

  async toggleChildActive(id: string): Promise<void> {
    await this.childService.toggleChildActive(id);
    await this.refreshChildren();
  }

  async deleteChild(id: string): Promise<void> {
    await this.childService.deleteChild(id);
    await this.refreshAll();
  }

  private async refreshChildren(): Promise<void> {
    const children = await this.storage.getAllChildren();
    this._children.set(children);
  }

  // Cancellation management
  async toggleCancellation(childId: string, date: string): Promise<boolean> {
    const result = await this.mealService.toggleMealCancellation(childId, date);
    if (result.success) {
      await this.refreshCancellations();
    }
    return result.success;
  }

  async isCancelled(childId: string, date: string): Promise<boolean> {
    return this.mealService.isMealCancelled(childId, date);
  }

  getCancellationsForDate(date: string): MealCancellation[] {
    return this._cancellations().filter(c => c.date === date);
  }

  isChildCancelledForDate(childId: string, date: string): boolean {
    return this._cancellations().some(c => c.childId === childId && c.date === date);
  }

  private async refreshCancellations(): Promise<void> {
    const cancellations = await this.storage.getAllCancellations();
    this._cancellations.set(cancellations);
  }

  // Calendar navigation
  setMonth(year: number, month: number): void {
    this._currentYear.set(year);
    this._currentMonth.set(month);
  }

  canGoBack(): boolean {
    const year = this._currentYear();
    const month = this._currentMonth();
    // Nie pozwalamy cofać się przed styczeń 2026
    return !(year === 2026 && month === 0);
  }

  previousMonth(): void {
    if (!this.canGoBack()) return;
    
    const { year, month } = this.dateService.getPreviousMonth(
      this._currentYear(),
      this._currentMonth()
    );
    this.setMonth(year, month);
  }

  nextMonth(): void {
    const { year, month } = this.dateService.getNextMonth(
      this._currentYear(),
      this._currentMonth()
    );
    this.setMonth(year, month);
  }

  goToCurrentMonth(): void {
    const { year, month } = this.dateService.getCurrentMonth();
    this.setMonth(year, month);
  }

  // Date selection
  selectDate(date: string | null): void {
    this._selectedDate.set(date);
  }

  // Settings
  async updateMealRate(rate: number): Promise<void> {
    const updated = await this.mealService.updateSettings({ globalMealRate: rate });
    this._settings.set(updated);
  }

  async updateDeadlineHour(hour: number): Promise<void> {
    const updated = await this.mealService.updateSettings({ deadlineHour: hour });
    this._settings.set(updated);
  }

  async updateAdminPin(pin: string): Promise<void> {
    const updated = await this.mealService.updateSettings({ adminPin: pin });
    this._settings.set(updated);
  }

  async updateShowPaymentPanel(show: boolean): Promise<void> {
    const updated = await this.mealService.updateSettings({ showPaymentPanel: show });
    this._settings.set(updated);
  }

  async addHoliday(date: string, name: string): Promise<void> {
    const currentSettings = this._settings();
    const holidays = currentSettings.holidays || [];
    if (!holidays.some(h => h.date === date)) {
      const newHoliday: Holiday = { date, name };
      const updated = await this.mealService.updateSettings({ 
        holidays: [...holidays, newHoliday].sort((a, b) => a.date.localeCompare(b.date)) 
      });
      this._settings.set(updated);
    }
  }

  async removeHoliday(date: string): Promise<void> {
    const currentSettings = this._settings();
    const holidays = currentSettings.holidays || [];
    const updated = await this.mealService.updateSettings({ 
      holidays: holidays.filter(h => h.date !== date) 
    });
    this._settings.set(updated);
  }

  // Meal Rate Periods
  async addMealRatePeriod(startDate: string, endDate: string, rate: number): Promise<void> {
    const currentSettings = this._settings();
    const periods = currentSettings.mealRatePeriods || [];
    const newPeriod: MealRatePeriod = {
      id: crypto.randomUUID(),
      startDate,
      endDate,
      rate
    };
    const updated = await this.mealService.updateSettings({
      mealRatePeriods: [...periods, newPeriod].sort((a, b) => a.startDate.localeCompare(b.startDate))
    });
    this._settings.set(updated);
  }

  async removeMealRatePeriod(id: string): Promise<void> {
    const currentSettings = this._settings();
    const periods = (currentSettings.mealRatePeriods || []).filter(p => p.id !== id);
    const updated = await this.mealService.updateSettings({ mealRatePeriods: periods });
    this._settings.set(updated);
  }

  // Get meal rate for a specific month (uses first day of month to determine rate)
  getMealRateForMonth(year: number, month: number): number {
    const settings = this._settings();
    const periods = settings.mealRatePeriods || [];
    // Use first day of the month to determine rate
    const firstDayOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const matchingPeriod = periods.find(p => firstDayOfMonth >= p.startDate && firstDayOfMonth <= p.endDate);
    return matchingPeriod ? matchingPeriod.rate : settings.globalMealRate;
  }

  // Reports
  async getMonthlyReport(year: number, month: number) {
    return this.mealService.getMonthlyReport(year, month);
  }

  async exportMonthlyReportCSV(year: number, month: number): Promise<void> {
    await this.mealService.exportMonthlyReportCSV(year, month);
  }

  // Data export/import
  async exportData(): Promise<void> {
    const data = await this.storage.exportAllData();
    const json = JSON.stringify(data, null, 2);
    const filename = `meal-reservation-backup-${this.dateService.toISODate(new Date())}.json`;
    this.storage.downloadFile(json, filename, 'application/json');
  }

  async importData(file: File): Promise<void> {
    const text = await file.text();
    const data = JSON.parse(text);
    await this.storage.importData(data);
    await this.refreshAll();
  }
}
