import { Injectable } from '@angular/core';
import {
  format,
  parse,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isBefore,
  isAfter,
  setHours,
  setMinutes,
  setSeconds,
  getDay,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  isToday
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { Holiday } from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class DateService {
  private readonly locale = pl;

  // Format date to Polish locale
  formatPolish(date: Date, formatStr: string = 'EEEE, d MMMM yyyy'): string {
    return format(date, formatStr, { locale: this.locale });
  }

  // Format date to ISO string (YYYY-MM-DD)
  toISODate(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  }

  // Parse ISO date string to Date
  parseISODate(dateStr: string): Date {
    return parse(dateStr, 'yyyy-MM-dd', new Date());
  }

  // Check if a date is a holiday
  isHoliday(date: Date | string, holidays: Holiday[]): boolean {
    const dateStr = typeof date === 'string' ? date : this.toISODate(date);
    return holidays.some(h => h.date === dateStr);
  }

  // Get holiday name for a date (if it's a holiday)
  getHolidayName(date: Date | string, holidays: Holiday[]): string | null {
    const dateStr = typeof date === 'string' ? date : this.toISODate(date);
    const holiday = holidays.find(h => h.date === dateStr);
    return holiday ? holiday.name : null;
  }

  // Check if a date is a working day (Mon-Fri and not a holiday)
  isWorkingDayWithHolidays(date: Date, holidays: Holiday[] = []): boolean {
    if (!this.isWorkingDay(date)) return false;
    return !this.isHoliday(date, holidays);
  }

  // Get previous working day (considering weekends and holidays)
  getPreviousWorkingDay(date: Date, holidays: Holiday[] = []): Date {
    let current = subDays(date, 1);
    while (!this.isWorkingDayWithHolidays(current, holidays)) {
      current = subDays(current, 1);
    }
    return current;
  }

  // Get next working day (considering weekends and holidays)
  getNextWorkingDay(date: Date, holidays: Holiday[] = []): Date {
    let current = addDays(date, 1);
    while (!this.isWorkingDayWithHolidays(current, holidays)) {
      current = addDays(current, 1);
    }
    return current;
  }

  // Check if date is within child's attendance range
  isDateInAttendanceRange(date: Date | string, startDate?: string | null, endDate?: string | null): boolean {
    const target = typeof date === 'string' ? this.parseISODate(date) : date;
    
    if (startDate) {
      const start = this.parseISODate(startDate);
      if (isBefore(target, start)) return false;
    }
    
    if (endDate) {
      const end = this.parseISODate(endDate);
      if (isAfter(target, end)) return false;
    }
    
    return true;
  }

  // Check if cancellation is allowed for a given date
  // Deadline is 17:00 (5 PM) the day before
  canCancelForDate(targetDate: Date | string, deadlineHour: number = 17, holidays: Holiday[] = []): boolean {
    const target = typeof targetDate === 'string' ? this.parseISODate(targetDate) : targetDate;
    const now = new Date();
    
    // Calculate deadline: previous working day before target date at deadlineHour:00
    // This means for Monday, the deadline is Friday 17:00
    const previousWorkingDay = this.getPreviousWorkingDay(target, holidays);
    const deadline = setSeconds(
      setMinutes(
        setHours(previousWorkingDay, deadlineHour),
        0
      ),
      0
    );

    return isBefore(now, deadline);
  }

  // Get the next day that can be cancelled (considering deadline)
  getNextCancellableDate(deadlineHour: number = 17): Date {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Check if we can still cancel for tomorrow
    const tomorrow = addDays(today, 1);
    if (this.canCancelForDate(tomorrow, deadlineHour)) {
      return tomorrow;
    }
    
    // Otherwise, day after tomorrow
    return addDays(today, 2);
  }

  // Get all working days (Mon-Fri) in a month
  getWorkingDaysInMonth(year: number, month: number): Date[] {
    const start = startOfMonth(new Date(year, month));
    const end = endOfMonth(start);
    
    const allDays = eachDayOfInterval({ start, end });
    
    return allDays.filter(day => {
      const dayOfWeek = getDay(day);
      return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday = 1, Friday = 5
    });
  }

  // Get working days count in a month
  getWorkingDaysCount(year: number, month: number): number {
    return this.getWorkingDaysInMonth(year, month).length;
  }

  // Check if a date is a working day (Mon-Fri)
  isWorkingDay(date: Date): boolean {
    const dayOfWeek = getDay(date);
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }

  // Get calendar grid for a month (including padding days from prev/next months)
  getCalendarGrid(year: number, month: number): Date[] {
    const start = startOfMonth(new Date(year, month));
    const end = endOfMonth(start);
    
    // Get the start of the week containing the first day of month
    const calendarStart = startOfWeek(start, { weekStartsOn: 1 }); // Monday
    // Get the end of the week containing the last day of month
    const calendarEnd = endOfWeek(end, { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }

  // Check if date is in the given month
  isInMonth(date: Date, year: number, month: number): boolean {
    return isSameMonth(date, new Date(year, month));
  }

  // Check if two dates are the same day
  isSameDay(date1: Date, date2: Date): boolean {
    return isSameDay(date1, date2);
  }

  // Check if date is today
  isToday(date: Date): boolean {
    return isToday(date);
  }

  // Check if date is in the past
  isPast(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return isBefore(date, today);
  }

  // Check if date is in the future
  isFuture(date: Date): boolean {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return isAfter(date, today);
  }

  // Get month name in Polish
  getMonthName(month: number): string {
    const date = new Date(2024, month, 1);
    return format(date, 'LLLL', { locale: this.locale });
  }

  // Get short day names in Polish (Mon, Tue, etc.)
  getShortDayNames(): string[] {
    return ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];
  }

  // Get current month and year
  getCurrentMonth(): { year: number; month: number } {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }

  // Navigate to previous month
  getPreviousMonth(year: number, month: number): { year: number; month: number } {
    if (month === 0) {
      return { year: year - 1, month: 11 };
    }
    return { year, month: month - 1 };
  }

  // Navigate to next month
  getNextMonth(year: number, month: number): { year: number; month: number } {
    if (month === 11) {
      return { year: year + 1, month: 0 };
    }
    return { year, month: month + 1 };
  }
}
