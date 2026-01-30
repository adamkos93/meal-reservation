import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services';
import { AppState } from '../../state/app.state';

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

  async ngOnInit() {
    await this.state.initialize();
  }
}
