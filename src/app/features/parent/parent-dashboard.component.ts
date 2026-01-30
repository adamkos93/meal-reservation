import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService, DateService } from '../../core/services';
import { AppState } from '../../state/app.state';
import { addDays } from 'date-fns';

@Component({
  selector: 'app-parent-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="parent-page">
      <header class="page-header">
        <div class="header-content">
          <h1>👋 Witaj!</h1>
          <p class="child-name">Dziecko: <strong>{{ auth.getChildNickname() }}</strong></p>
        </div>
        <button class="logout-btn" (click)="auth.logout()">
          🚪 Wyloguj
        </button>
      </header>

      @if (state.isLoading()) {
        <div class="loading">Ładowanie...</div>
      } @else {
        <div class="action-cards">
          <a routerLink="/parent/cancel" class="action-card primary">
            <span class="card-icon">📝</span>
            <div class="card-content">
              <span class="card-title">Odwołaj posiłki na dany dzień</span>
              <span class="card-desc">Zgłoś nieobecność na obiad</span>
            </div>
          </a>

          @if (state.settings().showPaymentPanel) {
            <a routerLink="/parent/summary" class="action-card">
              <span class="card-icon">📊</span>
              <div class="card-content">
                <span class="card-title">Podsumowanie miesiąca</span>
                <span class="card-desc">Sprawdź kwotę do zapłaty</span>
              </div>
            </a>
          }
        </div>

        <section class="upcoming-section">
          <h2>Nadchodzące dni</h2>

          @if (upcomingDays().length === 0) {
            <p class="empty-message">Brak nadchodzących dni roboczych.</p>
          } @else {
            <div class="upcoming-list">
              @for (day of upcomingDays(); track day.dateStr) {
                <div class="day-row" [class.cancelled]="day.isCancelled">
                  <div class="day-info">
                    <span class="day-name">{{ day.dayName }}</span>
                    <span class="day-date">{{ day.formatted }}</span>
                  </div>
                  <div class="day-status">
                    @if (day.isCancelled) {
                      <span class="status cancelled">❌ Odwołany</span>
                    } @else {
                      <span class="status active">✅ Zamówiony</span>
                    }
                  </div>
                  @if (day.canCancel) {
                    <span class="can-edit">✏️</span>
                  }
                </div>
              }
            </div>
          }
        </section>

        <section class="info-section">
          <h2>ℹ️ Informacje</h2>
          <div class="info-row">
            <span>Stawka za dzień wyżywienia</span>
            <strong>{{ state.settings().globalMealRate.toFixed(2) }} PLN</strong>
          </div>
          <div class="info-row">
            <span>Termin odwoływania</span>
            <strong>do {{ state.settings().deadlineHour }}:00 dzień wcześniej</strong>
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
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      gap: 1rem;
    }

    .header-content h1 {
      margin: 0;
      font-size: 1.5rem;
    }

    .child-name {
      margin: 0.25rem 0 0;
      color: #666;
    }

    .logout-btn {
      padding: 0.5rem 1rem;
      background: #f0f0f0;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: background 0.2s;
      white-space: nowrap;
    }

    .logout-btn:hover {
      background: #e0e0e0;
    }

    .loading {
      text-align: center;
      padding: 3rem;
      color: #666;
    }

    .action-cards {
      display: grid;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .action-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      background: white;
      border-radius: 12px;
      text-decoration: none;
      color: inherit;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .action-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .action-card.primary {
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white;
    }

    .card-icon {
      font-size: 2rem;
    }

    .card-content {
      display: flex;
      flex-direction: column;
    }

    .card-title {
      font-weight: 600;
      font-size: 1.125rem;
    }

    .card-desc {
      font-size: 0.875rem;
      opacity: 0.8;
    }

    .upcoming-section, .info-section {
      background: white;
      border-radius: 12px;
      padding: 1.25rem;
      margin-bottom: 1rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .upcoming-section h2, .info-section h2 {
      margin: 0 0 1rem;
      font-size: 1rem;
      color: #333;
    }

    .empty-message {
      color: #666;
      text-align: center;
      padding: 1rem;
    }

    .upcoming-list {
      display: flex;
      flex-direction: column;
    }

    .day-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 0;
      border-bottom: 1px solid #eee;
    }

    .day-row:last-child {
      border-bottom: none;
    }

    .day-row.cancelled {
      opacity: 0.7;
    }

    .day-info {
      flex: 1;
    }

    .day-name {
      display: block;
      font-weight: 500;
      text-transform: capitalize;
    }

    .day-date {
      display: block;
      color: #666;
      font-size: 0.875rem;
    }

    .status {
      font-size: 0.875rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }

    .status.cancelled {
      color: #c62828;
      background: #ffebee;
    }

    .status.active {
      color: #2e7d32;
      background: #e8f5e9;
    }

    .can-edit {
      font-size: 0.875rem;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #eee;
    }

    .info-row:last-child {
      border-bottom: none;
    }

    .info-row span {
      color: #666;
    }
  `]
})
export class ParentDashboardComponent implements OnInit {
  auth = inject(AuthService);
  state = inject(AppState);
  private dateService = inject(DateService);

  upcomingDays = computed(() => {
    const childId = this.auth.getChildId();
    if (!childId) return [];

    const child = this.state.children().find(c => c.id === childId);
    const days = [];
    const today = new Date();
    const settings = this.state.settings();
    const holidays = settings.holidays || [];

    for (let i = 0; i <= 14; i++) {
      const date = addDays(today, i);

      if (!this.dateService.isWorkingDay(date)) continue;

      // Skip holidays
      if (this.dateService.isHoliday(date, holidays)) continue;

      // Skip days outside child's attendance range
      if (!this.dateService.isDateInAttendanceRange(date, child?.startDate, child?.endDate)) continue;

      const dateStr = this.dateService.toISODate(date);
      const isCancelled = this.state.isChildCancelledForDate(childId, dateStr);
      const canCancel = this.dateService.canCancelForDate(date, settings.deadlineHour, holidays);

      days.push({
        date,
        dateStr,
        dayName: this.dateService.formatPolish(date, 'EEEE'),
        formatted: this.dateService.formatPolish(date, 'd MMMM'),
        isCancelled,
        canCancel
      });

      if (days.length >= 7) break;
    }

    return days;
  });

  async ngOnInit() {
    await this.state.initialize();
  }
}
