import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppState } from '../../state/app.state';
import { DateService, MonthlyReport } from '../../core/services';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="reports-page">
      <header class="page-header">
        <a routerLink="/" class="back-link">← Powrót</a>
        <h1>📊 Raporty</h1>
      </header>

      <section class="month-selector">
        <button class="nav-btn" (click)="previousMonth()">← Poprzedni</button>
        <h2 class="current-month">{{ monthName() }} {{ year() }}</h2>
        <button class="nav-btn" (click)="nextMonth()">Następny →</button>
      </section>

      @if (isLoading()) {
        <div class="loading">Ładowanie raportu...</div>
      } @else if (report()) {
        <section class="report-summary">
          <h2>Podsumowanie miesiąca</h2>
          <div class="summary-grid">
            <div class="summary-card">
              <div class="value">{{ report()!.totalWorkingDays }}</div>
              <div class="label">Dni roboczych</div>
            </div>
            <div class="summary-card">
              <div class="value">{{ report()!.mealRate.toFixed(2) }} zł</div>
              <div class="label">Stawka za obiad</div>
            </div>
            <div class="summary-card highlight">
              <div class="value">{{ report()!.totalAmount.toFixed(2) }} zł</div>
              <div class="label">Razem do zapłaty</div>
            </div>
          </div>
        </section>

        <section class="children-report">
          <div class="section-header">
            <h2>Rozliczenie per dziecko</h2>
            <button class="export-btn" (click)="exportCSV()">
              📥 Eksportuj CSV
            </button>
          </div>

          @if (report()!.childSummaries.length === 0) {
            <p class="empty-message">Brak aktywnych dzieci w tym miesiącu.</p>
          } @else {
            <div class="table-wrapper">
              <table class="report-table">
                <thead>
                  <tr>
                    <th>Dziecko</th>
                    <th>ID</th>
                    <th class="number">Dni robocze</th>
                    <th class="number">Odwołane</th>
                    <th class="number">Do zapłaty</th>
                    <th class="number">Kwota</th>
                  </tr>
                </thead>
                <tbody>
                  @for (child of report()!.childSummaries; track child.childId) {
                    <tr>
                      <td class="name">{{ child.childNickname }}</td>
                      <td class="id">{{ child.childIdentifier || '-' }}</td>
                      <td class="number">{{ child.workingDays }}</td>
                      <td class="number cancelled">{{ child.cancelledDays }}</td>
                      <td class="number">{{ child.mealsToPay }}</td>
                      <td class="number amount">{{ child.amountToPay.toFixed(2) }} zł</td>
                    </tr>
                  }
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="5" class="total-label">RAZEM</td>
                    <td class="number total-amount">{{ report()!.totalAmount.toFixed(2) }} zł</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          }
        </section>

        <section class="daily-summary">
          <h2>Podsumowanie dzienne</h2>
          <p class="section-description">
            Liczba posiłków do zamówienia na każdy dzień roboczy.
          </p>
          
          <div class="daily-grid">
            @for (day of dailySummary(); track day.dateStr) {
              <div class="daily-card" [class.past]="day.isPast">
                <div class="day-header">
                  <span class="day-name">{{ day.dayName }}</span>
                  <span class="day-date">{{ day.formatted }}</span>
                </div>
                <div class="day-stats">
                  <div class="stat">
                    <span class="stat-value ordered">{{ day.mealsOrdered }}</span>
                    <span class="stat-label">zamówionych</span>
                  </div>
                  @if (day.cancelled > 0) {
                    <div class="stat">
                      <span class="stat-value cancelled">-{{ day.cancelled }}</span>
                      <span class="stat-label">odwołanych</span>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .reports-page {
      max-width: 800px;
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
      background: #f0f0f0;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: background 0.2s;
    }

    .nav-btn:hover {
      background: #e0e0e0;
    }

    .loading {
      text-align: center;
      padding: 3rem;
      color: #666;
    }

    .report-summary, .children-report, .daily-summary {
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

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    .summary-card {
      text-align: center;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .summary-card.highlight {
      background: #e8f5e9;
    }

    .summary-card .value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1a1a2e;
    }

    .summary-card .label {
      font-size: 0.75rem;
      color: #666;
      margin-top: 0.25rem;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .section-header h2 {
      margin: 0;
    }

    .export-btn {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: background 0.2s;
    }

    .export-btn:hover {
      background: #43a047;
    }

    .empty-message {
      color: #666;
      text-align: center;
      padding: 2rem;
    }

    .table-wrapper {
      overflow-x: auto;
    }

    .report-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .report-table th,
    .report-table td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #eee;
    }

    .report-table th {
      font-weight: 600;
      color: #666;
      font-size: 0.75rem;
      text-transform: uppercase;
    }

    .report-table td.number,
    .report-table th.number {
      text-align: right;
    }

    .report-table td.name {
      font-weight: 500;
    }

    .report-table td.id {
      color: #666;
    }

    .report-table td.cancelled {
      color: #f44336;
    }

    .report-table td.amount {
      font-weight: 600;
      color: #4CAF50;
    }

    .report-table tfoot td {
      font-weight: 700;
      border-top: 2px solid #333;
    }

    .total-label {
      text-align: right;
    }

    .total-amount {
      color: #4CAF50;
    }

    .section-description {
      color: #666;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }

    .daily-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 0.75rem;
    }

    .daily-card {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 0.75rem;
    }

    .daily-card.past {
      opacity: 0.6;
    }

    .day-header {
      margin-bottom: 0.5rem;
    }

    .day-name {
      display: block;
      font-size: 0.625rem;
      text-transform: uppercase;
      color: #666;
    }

    .day-date {
      display: block;
      font-weight: 600;
    }

    .day-stats {
      display: flex;
      gap: 0.5rem;
    }

    .stat {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-weight: 700;
    }

    .stat-value.ordered {
      color: #4CAF50;
    }

    .stat-value.cancelled {
      color: #f44336;
    }

    .stat-label {
      font-size: 0.625rem;
      color: #666;
    }

    @media (max-width: 480px) {
      .summary-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ReportsComponent {
  state = inject(AppState);
  private dateService = inject(DateService);

  private _year = signal(new Date().getFullYear());
  private _month = signal(new Date().getMonth());
  private _report = signal<MonthlyReport | null>(null);
  private _isLoading = signal(false);

  year = this._year.asReadonly();
  month = this._month.asReadonly();
  report = this._report.asReadonly();
  isLoading = this._isLoading.asReadonly();

  monthName = computed(() => this.dateService.getMonthName(this._month()));

  dailySummary = computed(() => {
    const report = this._report();
    if (!report) return [];

    const workingDays = this.dateService.getWorkingDaysInMonth(this._year(), this._month());
    const activeCount = this.state.activeChildren().length;
    const cancellations = this.state.cancellations();

    return workingDays.map(date => {
      const dateStr = this.dateService.toISODate(date);
      const cancelled = cancellations.filter(c => c.date === dateStr).length;

      return {
        date,
        dateStr,
        dayName: this.dateService.formatPolish(date, 'EEE'),
        formatted: this.dateService.formatPolish(date, 'd MMM'),
        mealsOrdered: activeCount - cancelled,
        cancelled,
        isPast: this.dateService.isPast(date)
      };
    });
  });

  async ngOnInit() {
    await this.loadReport();
  }

  async loadReport() {
    this._isLoading.set(true);
    try {
      const report = await this.state.getMonthlyReport(this._year(), this._month());
      this._report.set(report);
    } finally {
      this._isLoading.set(false);
    }
  }

  async previousMonth() {
    const { year, month } = this.dateService.getPreviousMonth(this._year(), this._month());
    this._year.set(year);
    this._month.set(month);
    await this.loadReport();
  }

  async nextMonth() {
    const { year, month } = this.dateService.getNextMonth(this._year(), this._month());
    this._year.set(year);
    this._month.set(month);
    await this.loadReport();
  }

  async exportCSV() {
    await this.state.exportMonthlyReportCSV(this._year(), this._month());
  }
}
