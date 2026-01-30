import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppState, CalendarDay } from '../../state/app.state';
import { DateService } from '../../core/services';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard">
      <header class="dashboard-header">
        <div class="header-top">
          <h1>🍽️ Panel Administratora</h1>
          <button class="logout-btn" (click)="logout()">🚪 Wyloguj</button>
        </div>
        <p class="subtitle">Zarządzaj obiadami dla dzieci</p>
      </header>

      @if (state.isLoading()) {
        <div class="loading">Ładowanie...</div>
      } @else {
        @if (state.nextWorkingDayInfo(); as nextDay) {
          <div class="next-day-info">
            <div class="next-day-header">
              <span class="next-day-icon">📅</span>
              <span class="next-day-title">Najbliższy dzień roboczy</span>
            </div>
            <div class="next-day-details">
              <span class="next-day-date">{{ nextDay.formatted }}</span>
              <span class="next-day-cancellations" [class.has-cancellations]="nextDay.cancellationsCount > 0">
                @if (nextDay.cancellationsCount > 0) {
                  ❌ Odwołano: {{ nextDay.cancellationsCount }} {{ nextDay.cancellationsCount === 1 ? 'posiłek' : (nextDay.cancellationsCount < 5 ? 'posiłki' : 'posiłków') }}
                } @else {
                  ✅ Brak odwołań
                }
              </span>
            </div>
          </div>
        }

        <div class="calendar-container">
          <div class="calendar-header">
            <button class="nav-btn" (click)="state.previousMonth()" [disabled]="!state.canGoBack()">
              ← Poprzedni
            </button>
            <h2 class="current-month">
              {{ state.currentMonthName() }} {{ state.currentYear() }}
            </h2>
            <button class="nav-btn" (click)="state.nextMonth()">
              Następny →
            </button>
          </div>

          <div class="calendar-grid">
            <div class="day-header" *ngFor="let day of dayNames">{{ day }}</div>
            
            @for (day of state.calendarDays(); track day.dateStr) {
              <div 
                class="calendar-day"
                [class.other-month]="!day.isCurrentMonth"
                [class.today]="day.isToday"
                [class.weekend]="!day.isWorkingDay && !day.isHoliday"
                [class.holiday]="day.isHoliday && day.isCurrentMonth"
                [class.past]="day.isPast"
                [class.has-cancellations]="day.cancellations.length > 0"
                [class.clickable]="day.isCurrentMonth && day.isWorkingDay && day.canCancel"
                (click)="onDayClick(day)"
                [title]="day.holidayName || ''"
              >
                <span class="day-number">{{ day.date.getDate() }}</span>
                @if (day.isCurrentMonth && day.isHoliday) {
                  <div class="day-info">
                    <span class="holiday-badge" [title]="day.holidayName || 'Dzień wolny'">🎉</span>
                  </div>
                } @else if (day.isCurrentMonth && day.isWorkingDay) {
                  <div class="day-info">
                    @if (day.cancellations.length > 0) {
                      <span class="cancelled-badge">
                        -{{ day.cancellations.length }}
                      </span>
                    }
                    @if (!day.canCancel && !day.isPast) {
                      <span class="deadline-passed">⏰</span>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <div class="legend">
            <div class="legend-item">
              <span class="legend-color today"></span>
              <span>Dzisiaj</span>
            </div>
            <div class="legend-item">
              <span class="legend-color cancelled"></span>
              <span>Są odwołania</span>
            </div>
            <div class="legend-item">
              <span class="legend-color holiday"></span>
              <span>Dzień wolny</span>
            </div>
            <div class="legend-item">
              <span class="legend-icon">⏰</span>
              <span>Deadline minął (17:00)</span>
            </div>
          </div>
        </div>

        <div class="quick-stats">
          <div class="stat-card">
            <div class="stat-value">{{ state.activeChildren().length }}</div>
            <div class="stat-label">Aktywnych dzieci</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ state.workingDaysInCurrentMonth().length }}</div>
            <div class="stat-label">Dni roboczych</div>
          </div>
        </div>

        <nav class="quick-links">
          <a routerLink="/admin/cancellation" class="quick-link primary">
            📝 Odwołaj posiłki na dany dzień
          </a>
          <a routerLink="/admin/children" class="quick-link">
            👶 Zarządzaj dziećmi
          </a>
          <a routerLink="/admin/reports" class="quick-link">
            📊 Raporty
          </a>
          <a routerLink="/admin/settings" class="quick-link">
            ⚙️ Ustawienia
          </a>
        </nav>
      }
    </div>
  `,
  styles: [`
    .dashboard {
      max-width: 800px;
      margin: 0 auto;
      padding: 1rem;
    }

    .dashboard-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .header-top h1 {
      font-size: 1.75rem;
      margin: 0;
      color: #1a1a2e;
    }

    .logout-btn {
      background: #f44336;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background 0.2s;
    }

    .logout-btn:hover {
      background: #d32f2f;
    }

    .subtitle {
      color: #666;
      margin: 0.5rem 0 0;
    }

    .loading {
      text-align: center;
      padding: 3rem;
      color: #666;
    }

    .next-day-info {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
      color: white;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .next-day-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .next-day-icon {
      font-size: 1.25rem;
    }

    .next-day-title {
      font-size: 0.875rem;
      opacity: 0.9;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .next-day-details {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .next-day-date {
      font-size: 1.25rem;
      font-weight: 600;
      text-transform: capitalize;
    }

    .next-day-cancellations {
      font-size: 1rem;
      padding: 0.5rem 0.75rem;
      background: rgba(255,255,255,0.2);
      border-radius: 8px;
      display: inline-block;
    }

    .next-day-cancellations.has-cancellations {
      background: rgba(244, 67, 54, 0.3);
    }

    .calendar-container {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 1.5rem;
    }

    .calendar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .current-month {
      font-size: 1.25rem;
      margin: 0;
      text-transform: capitalize;
    }

    .nav-btn {
      background: #f0f0f0;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: background 0.2s;
    }

    .nav-btn:hover:not(:disabled) {
      background: #e0e0e0;
    }

    .nav-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
    }

    .day-header {
      text-align: center;
      font-weight: 600;
      font-size: 0.75rem;
      color: #666;
      padding: 0.5rem;
    }

    .calendar-day {
      aspect-ratio: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      font-size: 0.875rem;
      background: #f8f9fa;
      position: relative;
      overflow: hidden;
    }

    .calendar-day.clickable {
      cursor: pointer;
    }

    .calendar-day.clickable:hover {
      background: #e8f4ff;
    }

    .calendar-day.other-month {
      background: transparent;
      color: #ccc;
    }

    .calendar-day.today {
      background: #4CAF50;
      color: white;
      font-weight: 600;
    }

    .calendar-day.weekend {
      background: #f0f0f0;
      color: #999;
    }

    .calendar-day.past:not(.today) {
      opacity: 0.6;
    }

    .calendar-day.has-cancellations {
      background: #ffebee;
    }

    .calendar-day.has-cancellations.today {
      background: #4CAF50;
    }

    .calendar-day.holiday {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .day-number {
      font-weight: 600;
      font-size: 1rem;
      line-height: 1;
    }

    .day-info {
      position: absolute;
      bottom: 4px;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      gap: 3px;
      line-height: 1;
    }

    .cancelled-badge {
      background: #f44336;
      color: white;
      font-size: 0.7rem;
      padding: 2px 4px;
      border-radius: 3px;
      line-height: 1;
    }

    .holiday-badge {
      font-size: 0.6rem;
      line-height: 1;
      white-space: nowrap;
    }

    .deadline-passed {
      font-size: 0.8rem;
      line-height: 1;
    }

    @media (min-width: 900px) {
      .day-number {
        font-size: 1.125rem;
      }

      .day-info {
        bottom: 6px;
        gap: 4px;
      }

      .cancelled-badge {
        font-size: 0.85rem;
        padding: 3px 6px;
        border-radius: 4px;
      }

      .deadline-passed {
        font-size: 1rem;
      }
    }

    .legend {
      display: flex;
      gap: 1.5rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #eee;
      font-size: 0.75rem;
      color: #666;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: 4px;
    }

    .legend-color.today {
      background: #4CAF50;
    }

    .legend-color.cancelled {
      background: #ffebee;
      border: 1px solid #f44336;
    }

    .legend-color.holiday {
      background: #e8f5e9;
      border: 1px solid #4CAF50;
    }

    .legend-icon {
      font-size: 1rem;
    }

    @media (max-width: 480px) {
      .calendar-container {
        padding: 1rem;
      }

      .calendar-grid {
        gap: 2px;
      }

      .calendar-day {
        border-radius: 4px;
        font-size: 0.7rem;
        padding-top: 4px;
      }

      .day-number {
        font-size: 0.85rem;
      }

      .day-info {
        bottom: 2px;
        gap: 2px;
      }

      .cancelled-badge {
        font-size: 0.55rem;
        padding: 1px 3px;
        border-radius: 2px;
      }

      .deadline-passed {
        font-size: 0.65rem;
      }

      .day-header {
        font-size: 0.625rem;
        padding: 0.25rem;
      }

      .nav-btn {
        padding: 0.375rem 0.5rem;
        font-size: 0.75rem;
      }

      .current-month {
        font-size: 1rem;
      }

      .legend {
        flex-wrap: wrap;
        gap: 0.75rem;
        font-size: 0.625rem;
      }

      .legend-color {
        width: 12px;
        height: 12px;
      }
    }

    .quick-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 1.25rem;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: #1a1a2e;
    }

    .stat-label {
      font-size: 0.875rem;
      color: #666;
    }

    .quick-links {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }

    .quick-link {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      background: white;
      border-radius: 12px;
      padding: 1rem;
      text-decoration: none;
      color: #1a1a2e;
      font-weight: 500;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .quick-link:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .quick-link.primary {
      background: #4CAF50;
      color: white;
      grid-column: span 2;
    }
  `]
})
export class DashboardComponent implements OnInit {
  state = inject(AppState);
  private dateService = inject(DateService);
  private authService = inject(AuthService);

  dayNames = this.dateService.getShortDayNames();

  async ngOnInit() {
    await this.state.initialize();
  }

  onDayClick(day: CalendarDay) {
    if (day.isCurrentMonth && day.isWorkingDay && day.canCancel) {
      this.state.selectDate(day.dateStr);
      // Navigate to cancellation page or open modal
    }
  }

  logout() {
    this.authService.logout();
  }
}
