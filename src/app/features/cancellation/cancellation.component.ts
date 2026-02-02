import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppState } from '../../state/app.state';
import { DateService } from '../../core/services';
import { Child } from '../../shared/models';

@Component({
  selector: 'app-cancellation',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="cancellation-page">
      <header class="page-header">
        <a routerLink="/admin" class="back-link">← Powrót</a>
        <h1>📝 Odwołaj posiłki na dany dzień</h1>
      </header>

      @if (state.activeChildren().length === 0) {
        <div class="empty-state">
          <p>Brak aktywnych dzieci.</p>
          <a routerLink="/admin/children" class="btn primary">Dodaj dziecko</a>
        </div>
      } @else {
        <section class="month-selector">
          <button class="nav-btn" (click)="previousMonth()" [disabled]="!canGoBack()">←</button>
          <h2 class="current-month">{{ currentMonthName() }} {{ currentYear() }}</h2>
          <button class="nav-btn" (click)="nextMonth()">→</button>
        </section>

        <section class="date-selector">
          <h2>Wybierz dzień</h2>
          <div class="date-grid">
            @for (day of monthDays(); track day.dateStr) {
              <button 
                class="date-cell"
                [class.active]="selectedDateStr() === day.dateStr"
                [class.past]="day.isPast"
                [class.editable]="day.canCancel"
                [class.has-cancellations]="day.cancellationsCount > 0"
                (click)="selectDate(day.dateStr)"
              >
                <span class="cell-day-name">{{ day.dayName }}</span>
                <span class="cell-date">{{ day.dayNumber }}</span>
                @if (day.cancellationsCount > 0) {
                  <span class="cell-badge">-{{ day.cancellationsCount }}</span>
                }
                @if (day.isPast) {
                  <span class="cell-status past">📖</span>
                } @else if (!day.canCancel) {
                  <span class="cell-status deadline">⏰</span>
                }
              </button>
            }
          </div>
          <div class="legend">
            <span class="legend-item"><span class="legend-icon past">📖</span> Historia (tylko odczyt)</span>
            <span class="legend-item"><span class="legend-icon">⏰</span> Po terminie</span>
            <span class="legend-item"><span class="legend-badge">-N</span> Odwołania</span>
          </div>
        </section>

        @if (selectedDateStr()) {
          <section class="children-section">
            <div class="section-header">
              <h2>{{ selectedDateFormatted() }}</h2>
              <div class="summary">
                <span class="ordered">✅ {{ mealsOrdered() }} zamówionych</span>
                <span class="cancelled">❌ {{ mealsCancelled() }} odwołanych</span>
              </div>
            </div>

            @if (isSelectedDatePast()) {
              <div class="history-info">
                📖 Dane historyczne — tryb tylko do odczytu
              </div>
            } @else if (!canCancelSelected()) {
              <div class="deadline-warning">
                ⚠️ Termin odwołania ({{ state.settings().deadlineHour }}:00 dzień wcześniej) już minął. Nie można zmienić zamówień.
              </div>
            }

            <ul class="children-list">
              @for (child of childrenForSelectedDate(); track child.id) {
                <li 
                  class="child-row"
                  [class.cancelled]="child.isCancelled"
                  [class.disabled]="!canCancelSelected() || isSelectedDatePast()"
                >
                  <div class="child-info">
                    <span class="child-nickname">{{ child.nickname }}</span>
                    @if (child.identifier) {
                      <span class="child-identifier">#{{ child.identifier }}</span>
                    }
                  </div>
                  <div class="meal-status">
                    @if (child.isCancelled) {
                      <span class="status cancelled">Odwołany</span>
                    } @else {
                      <span class="status ordered">Zamówiony</span>
                    }
                  </div>
                  @if (!isSelectedDatePast()) {
                    <button 
                      class="toggle-btn"
                      [class.restore]="child.isCancelled"
                      [disabled]="!canCancelSelected() || isToggling()"
                      (click)="toggleMeal(child.id)"
                    >
                      @if (child.isCancelled) {
                        🔄 Przywróć
                      } @else {
                        ❌ Odwołaj
                      }
                    </button>
                  }
                </li>
              }
            </ul>

            @if (canCancelSelected() && !isSelectedDatePast()) {
              <div class="bulk-actions">
                <button class="btn secondary" (click)="cancelAll()">
                  ❌ Odwołaj wszystkie
                </button>
                <button class="btn secondary" (click)="restoreAll()">
                  ✅ Przywróć wszystkie
                </button>
              </div>
            }
          </section>
        }
      }
    </div>
  `,
  styles: [`
    .cancellation-page {
      max-width: 600px;
      margin: 0 auto;
      padding: 1rem;
    }

    .page-header {
      margin-bottom: 2rem;
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

    .empty-state {
      background: white;
      border-radius: 12px;
      padding: 3rem;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .empty-state p {
      color: #666;
      margin-bottom: 1rem;
    }

    .date-selector, .children-section {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    h2 {
      font-size: 1rem;
      margin: 0 0 1rem;
      color: #333;
    }

    .month-selector {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: white;
      border-radius: 12px;
      padding: 1rem 1.5rem;
      margin-bottom: 1rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .current-month {
      font-size: 1.25rem;
      margin: 0;
      text-transform: capitalize;
    }

    .nav-btn {
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 8px;
      background: #f0f0f0;
      font-size: 1.25rem;
      cursor: pointer;
      transition: background 0.2s;
    }

    .nav-btn:hover:not(:disabled) {
      background: #e0e0e0;
    }

    .nav-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .date-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 0.5rem;
    }

    .date-cell {
      position: relative;
      padding: 0.75rem 0.5rem;
      border: 2px solid #eee;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s;
      min-height: 70px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .date-cell:hover {
      border-color: #4CAF50;
    }

    .date-cell.active {
      border-color: #4CAF50;
      background: #e8f5e9;
    }

    .date-cell.past {
      background: #f5f5f5;
      border-color: #ddd;
    }

    .date-cell.has-cancellations {
      border-color: #ffcdd2;
    }

    .date-cell.has-cancellations.active {
      border-color: #f44336;
      background: #ffebee;
    }

    .cell-day-name {
      display: block;
      font-size: 0.625rem;
      color: #999;
      text-transform: uppercase;
    }

    .cell-date {
      display: block;
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0.125rem 0;
    }

    .cell-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      font-size: 0.625rem;
      background: #f44336;
      color: white;
      padding: 2px 4px;
      border-radius: 4px;
    }

    .cell-status {
      font-size: 0.625rem;
    }

    .cell-status.past {
      color: #9e9e9e;
    }

    .cell-status.deadline {
      color: #ff9800;
    }

    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #eee;
      font-size: 0.75rem;
      color: #666;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .legend-badge {
      background: #f44336;
      color: white;
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 0.625rem;
    }

    .history-info {
      background: #e3f2fd;
      border: 1px solid #2196f3;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
      font-size: 0.875rem;
      color: #1565c0;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .summary {
      display: flex;
      gap: 1rem;
      font-size: 0.875rem;
    }

    .summary .ordered {
      color: #4CAF50;
    }

    .summary .cancelled {
      color: #f44336;
    }

    .deadline-warning {
      background: #fff3e0;
      border: 1px solid #ff9800;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
      font-size: 0.875rem;
      color: #e65100;
    }

    .children-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .child-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      border-bottom: 1px solid #eee;
      transition: background 0.2s;
    }

    .child-row:last-child {
      border-bottom: none;
    }

    .child-row.cancelled {
      background: #ffebee;
    }

    .child-row.disabled {
      opacity: 0.7;
    }

    .child-info {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .child-nickname {
      font-weight: 500;
    }

    .child-identifier {
      color: #666;
      font-size: 0.875rem;
    }

    .meal-status {
      min-width: 80px;
    }

    .status {
      font-size: 0.75rem;
      padding: 4px 8px;
      border-radius: 4px;
    }

    .status.ordered {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .status.cancelled {
      background: #ffebee;
      color: #c62828;
    }

    .toggle-btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 8px;
      background: #f44336;
      color: white;
      cursor: pointer;
      font-size: 0.875rem;
      transition: background 0.2s;
      white-space: nowrap;
    }

    .toggle-btn:hover:not(:disabled) {
      background: #d32f2f;
    }

    .toggle-btn.restore {
      background: #4CAF50;
    }

    .toggle-btn.restore:hover:not(:disabled) {
      background: #43a047;
    }

    .toggle-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .bulk-actions {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #eee;
    }

    .btn {
      flex: 1;
      padding: 0.75rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: background 0.2s;
    }

    .btn.primary {
      background: #4CAF50;
      color: white;
    }

    .btn.secondary {
      background: #f0f0f0;
      color: #333;
    }

    .btn.secondary:hover {
      background: #e0e0e0;
    }
  `]
})
export class CancellationComponent implements OnInit {
  state = inject(AppState);
  private dateService = inject(DateService);

  private _selectedDate = signal<string | null>(null);
  private _toggling = signal(false);
  private _currentYear = signal(new Date().getFullYear());
  private _currentMonth = signal(new Date().getMonth());

  selectedDateStr = this._selectedDate.asReadonly();
  isToggling = this._toggling.asReadonly();
  currentYear = this._currentYear.asReadonly();
  currentMonth = this._currentMonth.asReadonly();

  currentMonthName = computed(() => 
    this.dateService.getMonthName(this._currentMonth())
  );

  canGoBack = computed(() => {
    const year = this._currentYear();
    const month = this._currentMonth();
    // Nie cofamy się przed styczeń 2026
    return !(year === 2026 && month === 0);
  });

  monthDays = computed(() => {
    const year = this._currentYear();
    const month = this._currentMonth();
    const settings = this.state.settings();
    const holidays = settings.holidays || [];
    const cancellations = this.state.cancellations();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const workingDays = this.dateService.getWorkingDaysInMonth(year, month);
    
    return workingDays
      .filter(date => !this.dateService.isHoliday(date, holidays))
      .map(date => {
        const dateStr = this.dateService.toISODate(date);
        const isPast = date < today;
        const canCancel = !isPast && this.dateService.canCancelForDate(date, settings.deadlineHour, holidays);
        const dayCancellations = cancellations.filter(c => c.date === dateStr);

        return {
          date,
          dateStr,
          dayNumber: date.getDate(),
          dayName: this.dateService.formatPolish(date, 'EEE'),
          isPast,
          canCancel,
          cancellationsCount: dayCancellations.length
        };
      });
  });

  childrenForSelectedDate = computed(() => {
    const dateStr = this._selectedDate();
    if (!dateStr) return [];
    
    const date = this.dateService.parseISODate(dateStr);
    
    return this.state.activeChildren()
      .filter(child => this.dateService.isDateInAttendanceRange(date, child.startDate, child.endDate))
      .map(child => ({
        ...child,
        isCancelled: this.state.isChildCancelledForDate(child.id, dateStr)
      }));
  });

  selectedDateFormatted = computed(() => {
    const dateStr = this._selectedDate();
    if (!dateStr) return '';
    const date = this.dateService.parseISODate(dateStr);
    return this.dateService.formatPolish(date, 'EEEE, d MMMM');
  });

  isSelectedDatePast = computed(() => {
    const dateStr = this._selectedDate();
    if (!dateStr) return false;
    const date = this.dateService.parseISODate(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  });

  canCancelSelected = computed(() => {
    const dateStr = this._selectedDate();
    if (!dateStr) return false;
    if (this.isSelectedDatePast()) return false;
    const settings = this.state.settings();
    const holidays = settings.holidays || [];
    return this.dateService.canCancelForDate(dateStr, settings.deadlineHour, holidays);
  });

  mealsOrdered = computed(() => {
    const children = this.childrenForSelectedDate();
    const cancelled = children.filter(c => c.isCancelled).length;
    return children.length - cancelled;
  });

  mealsCancelled = computed(() => {
    return this.childrenForSelectedDate().filter(c => c.isCancelled).length;
  });

  ngOnInit() {
    // Select first available day (today or future with canCancel)
    const days = this.monthDays();
    const firstCancellable = days.find(d => d.canCancel);
    if (firstCancellable) {
      this._selectedDate.set(firstCancellable.dateStr);
    } else if (days.length > 0) {
      // Select first day of month if no cancellable days
      this._selectedDate.set(days[0].dateStr);
    }
  }

  previousMonth() {
    if (!this.canGoBack()) return;
    const { year, month } = this.dateService.getPreviousMonth(
      this._currentYear(),
      this._currentMonth()
    );
    this._currentYear.set(year);
    this._currentMonth.set(month);
    this._selectedDate.set(null);
  }

  nextMonth() {
    const { year, month } = this.dateService.getNextMonth(
      this._currentYear(),
      this._currentMonth()
    );
    this._currentYear.set(year);
    this._currentMonth.set(month);
    this._selectedDate.set(null);
  }

  selectDate(dateStr: string) {
    this._selectedDate.set(dateStr);
  }

  isChildCancelled(childId: string): boolean {
    const dateStr = this._selectedDate();
    if (!dateStr) return false;
    return this.state.isChildCancelledForDate(childId, dateStr);
  }

  async toggleMeal(childId: string) {
    const dateStr = this._selectedDate();
    if (!dateStr || this._toggling() || this.isSelectedDatePast()) return;

    this._toggling.set(true);
    try {
      await this.state.toggleCancellation(childId, dateStr);
    } finally {
      this._toggling.set(false);
    }
  }

  async cancelAll() {
    const dateStr = this._selectedDate();
    if (!dateStr || this.isSelectedDatePast()) return;

    for (const child of this.childrenForSelectedDate()) {
      if (!child.isCancelled) {
        await this.state.toggleCancellation(child.id, dateStr);
      }
    }
  }

  async restoreAll() {
    const dateStr = this._selectedDate();
    if (!dateStr || this.isSelectedDatePast()) return;

    for (const child of this.childrenForSelectedDate()) {
      if (child.isCancelled) {
        await this.state.toggleCancellation(child.id, dateStr);
      }
    }
  }
}
