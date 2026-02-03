import { Injectable, inject } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { DateService } from './date.service';
import { MealCancellation, CreateCancellationDto, AppSettings, DEFAULT_SETTINGS } from '../../shared/models';

export interface DailySummary {
  date: string;
  dateFormatted: string;
  totalChildren: number;
  cancelledCount: number;
  mealsToOrder: number;
  cancellations: MealCancellation[];
}

export interface ChildMonthlySummary {
  childId: string;
  childNickname: string;
  childIdentifier: string | null;
  workingDays: number;
  cancelledDays: number;
  mealsToPay: number;
  amountToPay: number;
}

export interface MonthlyReport {
  year: number;
  month: number;
  monthName: string;
  mealRate: number;
  totalWorkingDays: number;
  childSummaries: ChildMonthlySummary[];
  totalAmount: number;
}

@Injectable({
  providedIn: 'root'
})
export class MealService {
  private storage = inject(FirestoreService);
  private dateService = inject(DateService);

  // Cancel a meal for a child on a specific date
  async cancelMeal(dto: CreateCancellationDto): Promise<MealCancellation | null> {
    const settings = await this.getSettings();
    
    // Check if cancellation is still allowed
    if (!this.dateService.canCancelForDate(dto.date, settings.deadlineHour)) {
      return null;
    }

    // Check if already cancelled
    const existing = await this.storage.findCancellation(dto.childId, dto.date);
    if (existing) {
      return existing;
    }

    const cancellation: MealCancellation = {
      id: crypto.randomUUID(),
      childId: dto.childId,
      date: dto.date,
      createdAt: new Date().toISOString()
    };

    await this.storage.saveCancellation(cancellation);
    return cancellation;
  }

  // Restore a cancelled meal
  async restoreMeal(childId: string, date: string): Promise<boolean> {
    const settings = await this.getSettings();
    
    // Check if restoration is still allowed
    if (!this.dateService.canCancelForDate(date, settings.deadlineHour)) {
      return false;
    }

    const cancellation = await this.storage.findCancellation(childId, date);
    if (!cancellation) {
      return false;
    }

    await this.storage.deleteCancellation(cancellation.id);
    return true;
  }

  // Toggle meal cancellation
  async toggleMealCancellation(childId: string, date: string): Promise<{ cancelled: boolean; success: boolean }> {
    const existing = await this.storage.findCancellation(childId, date);
    
    if (existing) {
      const success = await this.restoreMeal(childId, date);
      return { cancelled: false, success };
    } else {
      const result = await this.cancelMeal({ childId, date });
      return { cancelled: result !== null, success: result !== null };
    }
  }

  // Check if a meal is cancelled
  async isMealCancelled(childId: string, date: string): Promise<boolean> {
    const cancellation = await this.storage.findCancellation(childId, date);
    return cancellation !== undefined;
  }

  // Get cancellations for a specific date
  async getCancellationsForDate(date: string): Promise<MealCancellation[]> {
    return this.storage.getCancellationsByDate(date);
  }

  // Get daily summary
  async getDailySummary(date: string, activeChildrenCount: number): Promise<DailySummary> {
    const cancellations = await this.getCancellationsForDate(date);
    const parsedDate = this.dateService.parseISODate(date);

    return {
      date,
      dateFormatted: this.dateService.formatPolish(parsedDate, 'EEEE, d MMMM'),
      totalChildren: activeChildrenCount,
      cancelledCount: cancellations.length,
      mealsToOrder: activeChildrenCount - cancellations.length,
      cancellations
    };
  }

  // Get meal rate for a specific month
  getMealRateForMonth(year: number, month: number, settings: AppSettings): number {
    const periods = settings.mealRatePeriods || [];
    const targetMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
    
    // Find all periods that start on or before the target month
    const applicablePeriods = periods.filter(p => p.startMonth <= targetMonth);
    
    if (applicablePeriods.length === 0) {
      return settings.globalMealRate;
    }
    
    // Get the most recent one (highest startMonth)
    const latestPeriod = applicablePeriods.reduce((latest, current) => 
      current.startMonth > latest.startMonth ? current : latest
    );
    
    return latestPeriod.rate;
  }

  // Get monthly report
  async getMonthlyReport(year: number, month: number): Promise<MonthlyReport> {
    const children = await this.storage.getAllChildren();
    const activeChildren = children.filter(c => c.isActive);
    const settings = await this.getSettings();
    const mealRate = this.getMealRateForMonth(year, month, settings);
    const workingDays = this.dateService.getWorkingDaysInMonth(year, month);
    const allCancellations = await this.storage.getAllCancellations();

    const childSummaries: ChildMonthlySummary[] = activeChildren.map(child => {
      // Filter working days by child's attendance range
      const childWorkingDays = workingDays.filter(date => 
        this.dateService.isDateInAttendanceRange(date, child.startDate, child.endDate)
      );

      const childCancellations = allCancellations.filter(c => {
        if (c.childId !== child.id) return false;
        const date = this.dateService.parseISODate(c.date);
        if (date.getFullYear() !== year || date.getMonth() !== month) return false;
        // Only count cancellations within child's attendance range
        return this.dateService.isDateInAttendanceRange(date, child.startDate, child.endDate);
      });

      const cancelledDays = childCancellations.length;
      const mealsToPay = childWorkingDays.length - cancelledDays;
      const amountToPay = mealsToPay * mealRate;

      return {
        childId: child.id,
        childNickname: child.nickname,
        childIdentifier: child.identifier,
        workingDays: childWorkingDays.length,
        cancelledDays,
        mealsToPay,
        amountToPay
      };
    });

    const totalAmount = childSummaries.reduce((sum, s) => sum + s.amountToPay, 0);

    return {
      year,
      month,
      monthName: this.dateService.getMonthName(month),
      mealRate,
      totalWorkingDays: workingDays.length,
      childSummaries,
      totalAmount
    };
  }

  // Export monthly report to CSV
  async exportMonthlyReportCSV(year: number, month: number): Promise<void> {
    const report = await this.getMonthlyReport(year, month);
    
    const headers = [
      'Dziecko',
      'Identyfikator',
      'Dni robocze',
      'Dni odwołane',
      'Posiłki do zapłaty',
      'Kwota (PLN)'
    ];

    const rows = report.childSummaries.map(s => [
      s.childNickname,
      s.childIdentifier || '-',
      s.workingDays.toString(),
      s.cancelledDays.toString(),
      s.mealsToPay.toString(),
      s.amountToPay.toFixed(2).replace('.', ',')
    ]);

    // Add total row
    rows.push([
      'RAZEM',
      '',
      '',
      '',
      '',
      report.totalAmount.toFixed(2).replace('.', ',')
    ]);

    const csv = this.storage.generateCSV(headers, rows);
    const filename = `raport-${report.monthName}-${year}.csv`;
    this.storage.downloadFile(csv, filename, 'text/csv;charset=utf-8');
  }

  // Settings
  async getSettings(): Promise<AppSettings> {
    const settings = await this.storage.getSettings();
    return settings || DEFAULT_SETTINGS;
  }

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings();
    const updated: AppSettings = {
      ...current,
      ...settings,
      id: 'app-settings'
    };
    await this.storage.saveSettings(updated);
    return updated;
  }
}
