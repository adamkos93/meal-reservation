import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService, DateService, MealService } from '../../core/services';
import { AppState } from '../../state/app.state';

@Component({
  selector: 'app-parent-summary',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="parent-page">
      <header class="page-header">
        <a routerLink="/parent" class="back-link">← Powrót</a>
        <h1>📊 Podsumowanie Miesiąca</h1>
        <p class="child-name">Dziecko: <strong>{{ auth.getChildNickname() }}</strong></p>
      </header>

      <div class="month-selector">
        <button class="nav-btn" (click)="previousMonth()" [disabled]="!canGoBack()">←</button>
        <span class="current-month">{{ currentMonthName() }} {{ currentYear() }}</span>
        <button class="nav-btn" (click)="nextMonth()">→</button>
      </div>

      @if (isLoading()) {
        <div class="loading">Ładowanie...</div>
      } @else if (summary()) {
        <section class="summary-section">
          <div class="summary-card highlight">
            <span class="card-label">Do zapłaty</span>
            <span class="card-value">{{ summary()!.amountToPay.toFixed(2) }} PLN</span>
          </div>

          <div class="summary-grid">
            <div class="summary-card">
              <span class="card-label">Dni robocze</span>
              <span class="card-value">{{ summary()!.workingDays }}</span>
            </div>
            <div class="summary-card">
              <span class="card-label">Odwołane</span>
              <span class="card-value cancelled">{{ summary()!.cancelledDays }}</span>
            </div>
            <div class="summary-card">
              <span class="card-label">Dni do zapłaty</span>
              <span class="card-value">{{ summary()!.mealsToPay }}</span>
            </div>
            <div class="summary-card">
              <span class="card-label">Stawka dzienna</span>
              <span class="card-value">{{ summary()!.mealRate.toFixed(2) }} PLN</span>
            </div>
          </div>
        </section>

        <section class="details-section">
          <h2>Szczegóły odwołań</h2>
          @if (summary()!.cancelledDates.length === 0) {
            <p class="empty-message">Brak odwołanych posiłków w tym miesiącu.</p>
          } @else {
            <ul class="cancelled-list">
              @for (date of summary()!.cancelledDates; track date.dateStr) {
                <li>
                  <span class="date-name">{{ date.dayName }}</span>
                  <span class="date-value">{{ date.formatted }}</span>
                </li>
              }
            </ul>
          }
        </section>

        <section class="calculation-section">
          <h2>Sposób obliczenia</h2>
          <div class="calculation">
            <div class="calc-row">
              <span>Dni robocze</span>
              <span>{{ summary()!.workingDays }}</span>
            </div>
            <div class="calc-row">
              <span>Odwołane dni</span>
              <span>- {{ summary()!.cancelledDays }}</span>
            </div>
            <div class="calc-row">
              <span>Dni do zapłaty</span>
              <span>= {{ summary()!.mealsToPay }}</span>
            </div>
            <div class="calc-row">
              <span>Stawka za dzień wyżywienia</span>
              <span>× {{ summary()!.mealRate.toFixed(2) }} PLN</span>
            </div>
            <div class="calc-row total">
              <span>Razem</span>
              <span>= {{ summary()!.amountToPay.toFixed(2) }} PLN</span>
            </div>
          </div>
        </section>
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

    .page-header h1 {
      margin: 0.5rem 0 0;
      font-size: 1.5rem;
    }

    .child-name {
      margin: 0.25rem 0 0;
      color: #666;
    }

    .month-selector {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
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

    .loading {
      text-align: center;
      padding: 3rem;
      color: #666;
    }

    .summary-section {
      margin-bottom: 1rem;
    }

    .summary-card {
      background: white;
      border-radius: 12px;
      padding: 1rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      text-align: center;
    }

    .summary-card.highlight {
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white;
      margin-bottom: 1rem;
    }

    .card-label {
      display: block;
      font-size: 0.875rem;
      opacity: 0.8;
      margin-bottom: 0.25rem;
    }

    .card-value {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .summary-card.highlight .card-value {
      font-size: 2rem;
    }

    .card-value.cancelled {
      color: #f44336;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }

    .details-section, .calculation-section {
      background: white;
      border-radius: 12px;
      padding: 1.25rem;
      margin-bottom: 1rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .details-section h2, .calculation-section h2 {
      margin: 0 0 1rem;
      font-size: 1rem;
      color: #333;
    }

    .empty-message {
      color: #666;
      text-align: center;
      padding: 1rem;
      margin: 0;
    }

    .cancelled-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .cancelled-list li {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #eee;
    }

    .cancelled-list li:last-child {
      border-bottom: none;
    }

    .date-name {
      text-transform: capitalize;
      font-weight: 500;
    }

    .date-value {
      color: #666;
    }

    .calculation {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .calc-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #eee;
    }

    .calc-row:last-child {
      border-bottom: none;
    }

    .calc-row.total {
      font-weight: 700;
      font-size: 1.125rem;
      color: #4CAF50;
      border-top: 2px solid #4CAF50;
      margin-top: 0.5rem;
      padding-top: 1rem;
    }
  `]
})
export class ParentSummaryComponent implements OnInit {
  auth = inject(AuthService);
  state = inject(AppState);
  private dateService = inject(DateService);

  currentYear = signal(new Date().getFullYear());
  currentMonth = signal(new Date().getMonth());
  isLoading = signal(true);

  currentMonthName = computed(() =>
    this.dateService.getMonthName(this.currentMonth())
  );

  canGoBack = computed(() => {
    const year = this.currentYear();
    const month = this.currentMonth();
    // Nie pozwalamy cofać się przed styczeń 2026
    return !(year === 2026 && month === 0);
  });

  summary = signal<{
    workingDays: number;
    cancelledDays: number;
    mealsToPay: number;
    mealRate: number;
    amountToPay: number;
    cancelledDates: { dateStr: string; dayName: string; formatted: string }[];
  } | null>(null);

  async ngOnInit() {
    await this.state.initialize();
    await this.loadSummary();
  }

  async loadSummary() {
    this.isLoading.set(true);

    const childId = this.auth.getChildId();
    if (!childId) {
      this.isLoading.set(false);
      return;
    }

    const child = this.state.children().find(c => c.id === childId);
    const year = this.currentYear();
    const month = this.currentMonth();
    const settings = this.state.settings();
    const holidays = settings.holidays || [];

    // Get all working days in month, then filter by child's attendance range and holidays
    const allWorkingDays = this.dateService.getWorkingDaysInMonth(year, month);
    const workingDays = allWorkingDays.filter(date => {
      // Exclude holidays
      if (this.dateService.isHoliday(date, holidays)) return false;
      // Exclude days outside child's attendance range
      if (!this.dateService.isDateInAttendanceRange(date, child?.startDate, child?.endDate)) return false;
      return true;
    });

    const cancellations = this.state.cancellations().filter(c => {
      if (c.childId !== childId) return false;
      const date = this.dateService.parseISODate(c.date);
      return date.getFullYear() === year && date.getMonth() === month;
    });

    const cancelledDates = cancellations.map(c => {
      const date = this.dateService.parseISODate(c.date);
      return {
        dateStr: c.date,
        dayName: this.dateService.formatPolish(date, 'EEEE'),
        formatted: this.dateService.formatPolish(date, 'd MMMM')
      };
    }).sort((a, b) => a.dateStr.localeCompare(b.dateStr));

    const mealsToPay = workingDays.length - cancellations.length;
    const amountToPay = mealsToPay * settings.globalMealRate;

    this.summary.set({
      workingDays: workingDays.length,
      cancelledDays: cancellations.length,
      mealsToPay,
      mealRate: settings.globalMealRate,
      amountToPay,
      cancelledDates
    });

    this.isLoading.set(false);
  }

  async previousMonth() {
    if (!this.canGoBack()) return;
    
    const { year, month } = this.dateService.getPreviousMonth(
      this.currentYear(),
      this.currentMonth()
    );
    this.currentYear.set(year);
    this.currentMonth.set(month);
    await this.loadSummary();
  }

  async nextMonth() {
    const { year, month } = this.dateService.getNextMonth(
      this.currentYear(),
      this.currentMonth()
    );
    this.currentYear.set(year);
    this.currentMonth.set(month);
    await this.loadSummary();
  }
}
