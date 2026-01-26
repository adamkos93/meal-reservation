import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppState } from '../../state/app.state';
import { DateService } from '../../core/services';
import { Child } from '../../shared/models';
import { addDays } from 'date-fns';

@Component({
  selector: 'app-cancellation',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="cancellation-page">
      <header class="page-header">
        <a routerLink="/" class="back-link">← Powrót</a>
        <h1>📝 Odwołaj Posiłek</h1>
      </header>

      @if (state.activeChildren().length === 0) {
        <div class="empty-state">
          <p>Brak aktywnych dzieci.</p>
          <a routerLink="/children" class="btn primary">Dodaj dziecko</a>
        </div>
      } @else {
        <section class="date-selector">
          <h2>Wybierz dzień</h2>
          <div class="date-tabs">
            @for (day of availableDays(); track day.dateStr) {
              <button 
                class="date-tab"
                [class.active]="selectedDateStr() === day.dateStr"
                [class.disabled]="!day.canCancel"
                [disabled]="!day.canCancel"
                (click)="selectDate(day.dateStr)"
              >
                <span class="day-name">{{ day.dayName }}</span>
                <span class="day-date">{{ day.formatted }}</span>
                @if (!day.canCancel) {
                  <span class="deadline-info">⏰ Po terminie</span>
                }
              </button>
            }
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

            @if (!canCancelSelected()) {
              <div class="deadline-warning">
                ⚠️ Termin odwołania (17:00 dzień wcześniej) już minął. Nie można zmienić zamówień.
              </div>
            }

            <ul class="children-list">
              @for (child of state.activeChildren(); track child.id) {
                <li 
                  class="child-row"
                  [class.cancelled]="isChildCancelled(child.id)"
                  [class.disabled]="!canCancelSelected()"
                >
                  <div class="child-info">
                    <span class="child-nickname">{{ child.nickname }}</span>
                    @if (child.identifier) {
                      <span class="child-identifier">#{{ child.identifier }}</span>
                    }
                  </div>
                  <div class="meal-status">
                    @if (isChildCancelled(child.id)) {
                      <span class="status cancelled">Odwołany</span>
                    } @else {
                      <span class="status ordered">Zamówiony</span>
                    }
                  </div>
                  <button 
                    class="toggle-btn"
                    [class.restore]="isChildCancelled(child.id)"
                    [disabled]="!canCancelSelected() || isToggling()"
                    (click)="toggleMeal(child.id)"
                  >
                    @if (isChildCancelled(child.id)) {
                      🔄 Przywróć
                    } @else {
                      ❌ Odwołaj
                    }
                  </button>
                </li>
              }
            </ul>

            @if (canCancelSelected()) {
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

    .date-tabs {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      padding-bottom: 0.5rem;
    }

    .date-tab {
      flex: 1;
      min-width: 100px;
      padding: 1rem;
      border: 2px solid #eee;
      border-radius: 12px;
      background: white;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s;
    }

    .date-tab:hover:not(:disabled) {
      border-color: #4CAF50;
    }

    .date-tab.active {
      border-color: #4CAF50;
      background: #e8f5e9;
    }

    .date-tab.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .day-name {
      display: block;
      font-size: 0.75rem;
      color: #666;
      text-transform: uppercase;
    }

    .day-date {
      display: block;
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0.25rem 0;
    }

    .deadline-info {
      display: block;
      font-size: 0.625rem;
      color: #f44336;
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

  selectedDateStr = this._selectedDate.asReadonly();
  isToggling = this._toggling.asReadonly();

  availableDays = computed(() => {
    const today = new Date();
    const days = [];
    const settings = this.state.settings();

    for (let i = 1; i <= 14; i++) {
      const date = addDays(today, i);
      
      // Skip weekends
      if (!this.dateService.isWorkingDay(date)) continue;

      const dateStr = this.dateService.toISODate(date);
      const canCancel = this.dateService.canCancelForDate(date, settings.deadlineHour);

      days.push({
        date,
        dateStr,
        dayName: this.dateService.formatPolish(date, 'EEEE'),
        formatted: this.dateService.formatPolish(date, 'd MMM'),
        canCancel
      });

      if (days.length >= 5) break;
    }

    return days;
  });

  selectedDateFormatted = computed(() => {
    const dateStr = this._selectedDate();
    if (!dateStr) return '';
    const date = this.dateService.parseISODate(dateStr);
    return this.dateService.formatPolish(date, 'EEEE, d MMMM');
  });

  canCancelSelected = computed(() => {
    const dateStr = this._selectedDate();
    if (!dateStr) return false;
    const settings = this.state.settings();
    return this.dateService.canCancelForDate(dateStr, settings.deadlineHour);
  });

  mealsOrdered = computed(() => {
    const dateStr = this._selectedDate();
    if (!dateStr) return 0;
    const cancelled = this.state.getCancellationsForDate(dateStr).length;
    return this.state.activeChildren().length - cancelled;
  });

  mealsCancelled = computed(() => {
    const dateStr = this._selectedDate();
    if (!dateStr) return 0;
    return this.state.getCancellationsForDate(dateStr).length;
  });

  ngOnInit() {
    // Select first available day
    const days = this.availableDays();
    const firstCancellable = days.find(d => d.canCancel);
    if (firstCancellable) {
      this._selectedDate.set(firstCancellable.dateStr);
    } else if (days.length > 0) {
      this._selectedDate.set(days[0].dateStr);
    }
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
    if (!dateStr || this._toggling()) return;

    this._toggling.set(true);
    try {
      await this.state.toggleCancellation(childId, dateStr);
    } finally {
      this._toggling.set(false);
    }
  }

  async cancelAll() {
    const dateStr = this._selectedDate();
    if (!dateStr) return;

    for (const child of this.state.activeChildren()) {
      if (!this.isChildCancelled(child.id)) {
        await this.state.toggleCancellation(child.id, dateStr);
      }
    }
  }

  async restoreAll() {
    const dateStr = this._selectedDate();
    if (!dateStr) return;

    for (const child of this.state.activeChildren()) {
      if (this.isChildCancelled(child.id)) {
        await this.state.toggleCancellation(child.id, dateStr);
      }
    }
  }
}
