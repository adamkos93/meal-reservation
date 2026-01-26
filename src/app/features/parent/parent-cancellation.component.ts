import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService, DateService } from '../../core/services';
import { AppState } from '../../state/app.state';
import { addDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';

type ViewMode = 'weekly' | 'monthly';

@Component({
  selector: 'app-parent-cancellation',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="parent-page">
      <header class="page-header">
        <a routerLink="/parent" class="back-link">← Powrót</a>
        <h1>📝 Odwołaj Posiłek</h1>
        <p class="child-name">Dziecko: <strong>{{ auth.getChildNickname() }}</strong></p>
      </header>

      @if (state.isLoading()) {
        <div class="loading">Ładowanie...</div>
      } @else {
        <div class="view-toggle">
          <button 
            class="toggle-view-btn" 
            [class.active]="viewMode() === 'weekly'"
            (click)="setViewMode('weekly')"
          >
            📅 Tygodniowy
          </button>
          <button 
            class="toggle-view-btn" 
            [class.active]="viewMode() === 'monthly'"
            (click)="setViewMode('monthly')"
          >
            🗓️ Miesięczny
          </button>
        </div>

        @if (viewMode() === 'monthly') {
          <div class="month-selector">
            <button class="nav-btn" (click)="previousMonth()" [disabled]="!canGoBack()">←</button>
            <span class="current-month">{{ currentMonthName() }} {{ currentYear() }}</span>
            <button class="nav-btn" (click)="nextMonth()">→</button>
          </div>
        }

        <section class="cancellation-section">
          <p class="info-text">
            Kliknij na dzień, aby odwołać lub przywrócić posiłek.
            <br>
            <small>Termin: do {{ state.settings().deadlineHour }}:00 dzień wcześniej</small>
          </p>

          @if (viewMode() === 'weekly') {
            <div class="days-list">
              @for (day of availableDays(); track day.dateStr) {
                <div
                  class="day-card"
                  [class.cancelled]="day.isCancelled"
                  [class.disabled]="!day.canCancel"
                  (click)="toggleDay(day)"
                >
                  <div class="day-header">
                    <span class="day-name">{{ day.dayName }}</span>
                    <span class="day-date">{{ day.formatted }}</span>
                  </div>
                  <div class="day-body">
                    @if (day.isCancelled) {
                      <span class="meal-status cancelled">❌ Odwołany</span>
                    } @else {
                      <span class="meal-status active">✅ Zamówiony</span>
                    }
                  </div>
                  <div class="day-footer">
                    @if (day.canCancel) {
                      <button class="toggle-btn" [class.restore]="day.isCancelled">
                        {{ day.isCancelled ? '🔄 Przywróć' : '❌ Odwołaj' }}
                      </button>
                    } @else {
                      <span class="deadline-passed">⏰ Termin minął</span>
                    }
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="calendar-header">
              @for (dayName of dayNames; track dayName) {
                <div class="calendar-day-name">{{ dayName }}</div>
              }
            </div>
            <div class="calendar-grid">
              @for (day of monthDays(); track day.dateStr) {
                <div 
                  class="calendar-day" 
                  [class.not-current-month]="!day.isCurrentMonth"
                  [class.not-working-day]="!day.isWorkingDay"
                  [class.cancelled]="day.isCancelled"
                  [class.disabled]="!day.canCancel"
                  [class.is-today]="day.isToday"
                  (click)="day.isWorkingDay && day.isCurrentMonth ? toggleDay(day) : null"
                >
                  <span class="calendar-day-number">{{ day.dayNumber }}</span>
                  @if (day.isWorkingDay && day.isCurrentMonth) {
                    @if (day.isCancelled) {
                      <span class="calendar-status cancelled">❌</span>
                    } @else if (day.canCancel) {
                      <span class="calendar-status active">✅</span>
                    } @else {
                      <span class="calendar-status past">✅</span>
                    }
                  }
                </div>
              }
            </div>
            <div class="calendar-legend">
              <span class="legend-item"><span class="legend-dot active"></span> Zamówiony</span>
              <span class="legend-item"><span class="legend-dot cancelled"></span> Odwołany</span>
            </div>
          }
        </section>

        @if (message()) {
          <div class="message" [class.success]="messageType() === 'success'" [class.error]="messageType() === 'error'">
            {{ message() }}
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .parent-page {
      max-width: 600px;
      margin: 0 auto;
      padding: 1rem;
    }

    .page-header {
      margin-bottom: 1.5rem;
    }

    .back-link {
      color: #666;
      text-decoration: none;
      font-size: 0.875rem;
    }

    .back-link:hover {
      color: #333;
    }

    .page-header h1 {
      margin: 0.5rem 0 0;
      font-size: 1.5rem;
    }

    .child-name {
      margin: 0.25rem 0 0;
      color: #666;
    }

    .loading {
      text-align: center;
      padding: 3rem;
      color: #666;
    }

    .cancellation-section {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .info-text {
      text-align: center;
      color: #666;
      margin: 0 0 1.5rem;
    }

    .info-text small {
      color: #999;
    }

    .days-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .day-card {
      border: 2px solid #eee;
      border-radius: 12px;
      padding: 1rem;
      transition: all 0.2s;
    }

    .day-card:not(.disabled) {
      cursor: pointer;
    }

    .day-card:not(.disabled):hover {
      border-color: #4CAF50;
      background: #fafafa;
    }

    .day-card.cancelled {
      background: #fff8f8;
      border-color: #ffcdd2;
    }

    .day-card.disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .day-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .day-name {
      font-weight: 600;
      text-transform: capitalize;
    }

    .day-date {
      color: #666;
      font-size: 0.875rem;
    }

    .day-body {
      margin-bottom: 0.75rem;
    }

    .meal-status {
      font-size: 0.875rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }

    .meal-status.cancelled {
      color: #c62828;
      background: #ffebee;
    }

    .meal-status.active {
      color: #2e7d32;
      background: #e8f5e9;
    }

    .day-footer {
      display: flex;
      justify-content: flex-end;
    }

    .toggle-btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 8px;
      background: #f44336;
      color: white;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background 0.2s;
    }

    .toggle-btn:hover {
      background: #d32f2f;
    }

    .toggle-btn.restore {
      background: #4CAF50;
    }

    .toggle-btn.restore:hover {
      background: #43a047;
    }

    .deadline-passed {
      color: #ff9800;
      font-size: 0.875rem;
    }

    .message {
      margin-top: 1rem;
      padding: 1rem;
      border-radius: 8px;
      text-align: center;
    }

    .message.success {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .message.error {
      background: #ffebee;
      color: #c62828;
    }

    .view-toggle {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
      justify-content: center;
    }

    .toggle-view-btn {
      padding: 0.5rem 1rem;
      border: 2px solid #ddd;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s;
    }

    .toggle-view-btn:hover {
      border-color: #4CAF50;
    }

    .toggle-view-btn.active {
      background: #4CAF50;
      color: white;
      border-color: #4CAF50;
    }

    .month-selector {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .nav-btn {
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 8px;
      background: white;
      font-size: 1.25rem;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .nav-btn:hover:not(:disabled) {
      background: #f5f5f5;
    }

    .nav-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .current-month {
      font-size: 1.125rem;
      font-weight: 600;
      text-transform: capitalize;
      min-width: 180px;
      text-align: center;
    }

    .calendar-header {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 2px;
      margin-bottom: 0.5rem;
    }

    .calendar-day-name {
      text-align: center;
      font-weight: 600;
      font-size: 0.75rem;
      color: #666;
      padding: 0.5rem 0;
    }

    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 2px;
    }

    .calendar-day {
      aspect-ratio: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: white;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid transparent;
      position: relative;
      min-height: 50px;
    }

    .calendar-day:not(.not-working-day):not(.not-current-month):not(.disabled):hover {
      border-color: #4CAF50;
      background: #fafafa;
    }

    .calendar-day.not-current-month {
      opacity: 0.3;
      cursor: default;
    }

    .calendar-day.not-working-day {
      background: #f5f5f5;
      cursor: default;
    }

    .calendar-day.cancelled {
      background: #fff8f8;
      border-color: #ffcdd2;
    }

    .calendar-day.disabled:not(.not-current-month):not(.not-working-day) {
      opacity: 0.7;
    }

    .calendar-day.is-today {
      border-color: #2196F3;
    }

    .calendar-day-number {
      font-weight: 600;
      font-size: 0.875rem;
    }

    .calendar-status {
      font-size: 0.75rem;
      margin-top: 2px;
    }

    .calendar-status.past {
      opacity: 0.5;
    }

    .calendar-legend {
      display: flex;
      justify-content: center;
      gap: 1.5rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #eee;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #666;
    }

    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .legend-dot.active {
      background: #4CAF50;
    }

    .legend-dot.cancelled {
      background: #f44336;
    }

    @media (max-width: 480px) {
      .cancellation-section {
        padding: 1rem;
      }

      .calendar-header {
        gap: 1px;
      }

      .calendar-day-name {
        font-size: 0.625rem;
        padding: 0.25rem 0;
      }

      .calendar-grid {
        gap: 1px;
      }

      .calendar-day {
        min-height: 40px;
        border-radius: 4px;
        border-width: 1px;
        padding: 2px;
      }

      .calendar-day-number {
        font-size: 0.75rem;
      }

      .calendar-status {
        font-size: 0.625rem;
        margin-top: 0;
      }

      .month-selector {
        gap: 0.5rem;
      }

      .nav-btn {
        width: 32px;
        height: 32px;
        font-size: 1rem;
      }

      .current-month {
        font-size: 0.95rem;
        min-width: 140px;
      }

      .view-toggle {
        gap: 0.25rem;
      }

      .toggle-view-btn {
        padding: 0.375rem 0.75rem;
        font-size: 0.75rem;
      }

      .calendar-legend {
        gap: 1rem;
      }

      .legend-item {
        font-size: 0.75rem;
      }

      .legend-dot {
        width: 10px;
        height: 10px;
      }
    }
  `]
})
export class ParentCancellationComponent implements OnInit {
  auth = inject(AuthService);
  state = inject(AppState);
  private dateService = inject(DateService);

  message = signal('');
  messageType = signal<'success' | 'error'>('success');
  viewMode = signal<ViewMode>('weekly');
  currentYear = signal(new Date().getFullYear());
  currentMonth = signal(new Date().getMonth());

  dayNames = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];

  currentMonthName = computed(() =>
    this.dateService.getMonthName(this.currentMonth())
  );

  canGoBack = computed(() => {
    const year = this.currentYear();
    const month = this.currentMonth();
    // Nie pozwalamy cofać się przed styczeń 2026
    return !(year === 2026 && month === 0);
  });

  monthDays = computed(() => {
    const year = this.currentYear();
    const month = this.currentMonth();
    const settings = this.state.settings();
    const childId = this.auth.getChildId();
    if (!childId) return [];

    const calendarDays = this.dateService.getCalendarGrid(year, month);
    const today = new Date();

    return calendarDays.map(date => {
      const dateStr = this.dateService.toISODate(date);
      const isCurrentMonth = this.dateService.isInMonth(date, year, month);
      const isWorkingDay = this.dateService.isWorkingDay(date);
      const isCancelled = this.state.isChildCancelledForDate(childId, dateStr);
      const canCancel = this.dateService.canCancelForDate(date, settings.deadlineHour);
      const isToday = this.dateService.isToday(date);

      return {
        date,
        dateStr,
        dayNumber: date.getDate(),
        isCurrentMonth,
        isWorkingDay,
        isCancelled,
        canCancel: isCurrentMonth && isWorkingDay && canCancel,
        isToday,
        dayName: this.dateService.formatPolish(date, 'EEEE'),
        formatted: this.dateService.formatPolish(date, 'd MMMM')
      };
    });
  });

  availableDays = computed(() => {
    const days = [];
    const today = new Date();
    const settings = this.state.settings();
    const childId = this.auth.getChildId();
    if (!childId) return [];

    for (let i = 1; i <= 14; i++) {
      const date = addDays(today, i);

      if (!this.dateService.isWorkingDay(date)) continue;

      const dateStr = this.dateService.toISODate(date);
      const isCancelled = this.state.isChildCancelledForDate(childId, dateStr);
      const canCancel = this.dateService.canCancelForDate(date, settings.deadlineHour);

      days.push({
        date,
        dateStr,
        dayName: this.dateService.formatPolish(date, 'EEEE'),
        formatted: this.dateService.formatPolish(date, 'd MMMM'),
        isCancelled,
        canCancel
      });

      if (days.length >= 10) break;
    }

    return days;
  });

  async ngOnInit() {
    await this.state.initialize();
  }

  setViewMode(mode: ViewMode) {
    this.viewMode.set(mode);
  }

  previousMonth() {
    if (!this.canGoBack()) return;
    
    const { year, month } = this.dateService.getPreviousMonth(
      this.currentYear(),
      this.currentMonth()
    );
    this.currentYear.set(year);
    this.currentMonth.set(month);
  }

  nextMonth() {
    const { year, month } = this.dateService.getNextMonth(
      this.currentYear(),
      this.currentMonth()
    );
    this.currentYear.set(year);
    this.currentMonth.set(month);
  }

  async toggleDay(day: { dateStr: string; canCancel: boolean; isCancelled: boolean }) {
    if (!day.canCancel) return;

    const childId = this.auth.getChildId();
    if (!childId) return;

    this.message.set('');

    try {
      const success = await this.state.toggleCancellation(childId, day.dateStr);
      if (success) {
        if (day.isCancelled) {
          this.message.set('✅ Posiłek został przywrócony');
        } else {
          this.message.set('❌ Posiłek został odwołany');
        }
        this.messageType.set('success');
      } else {
        this.message.set('Nie udało się zmienić statusu posiłku');
        this.messageType.set('error');
      }
    } catch (e) {
      this.message.set('Wystąpił błąd. Spróbuj ponownie.');
      this.messageType.set('error');
    }

    setTimeout(() => this.message.set(''), 3000);
  }
}
