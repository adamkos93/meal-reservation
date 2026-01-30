import { Component, inject, signal, computed, ElementRef, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AppState } from '../../state/app.state';
import { AuthService } from '../../core/services/auth.service';
import { DateService } from '../../core/services/date.service';
import { Holiday } from '../../shared/models';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="settings-page">
      <header class="page-header">
        <a routerLink="/admin" class="back-link">← Powrót</a>
        <h1>⚙️ Ustawienia</h1>
      </header>

      <section class="settings-section">
        <h2>Stawka za wyżywienie</h2>
        <div class="setting-row">
          <label for="mealRate">Cena za jeden dzień wyżywienia (PLN)</label>
          <div class="input-group">
            <input
              type="number"
              id="mealRate"
              [(ngModel)]="mealRate"
              min="0"
              step="0.01"
            />
            <button class="btn primary" (click)="saveMealRate()" [disabled]="isSaving()">
              Zapisz
            </button>
          </div>
        </div>
      </section>

      <section class="settings-section">
        <h2>Godzina deadline'u</h2>
        <div class="setting-row">
          <label for="deadlineHour">Godzina, do której można odwołać posiłek (dzień wcześniej)</label>
          <div class="input-group">
            <select id="deadlineHour" [(ngModel)]="deadlineHour">
              @for (hour of hours; track hour) {
                <option [value]="hour">{{ hour }}:00</option>
              }
            </select>
            <button class="btn primary" (click)="saveDeadlineHour()" [disabled]="isSaving()">
              Zapisz
            </button>
          </div>
        </div>
      </section>

      <section class="settings-section">
        <h2>PIN Administratora</h2>
        <div class="setting-row">
          <label for="adminPin">Zmień PIN dostępu do panelu admina</label>
          <div class="input-group">
            <input
              type="password"
              id="adminPin"
              [(ngModel)]="adminPin"
              placeholder="Nowy PIN"
              maxlength="10"
            />
            <button class="btn primary" (click)="saveAdminPin()" [disabled]="isSaving() || !adminPin">
              Zmień PIN
            </button>
          </div>
        </div>
      </section>

      <section class="settings-section">
        <h2>Panel płatności dla rodziców</h2>
        <div class="setting-row">
          <label for="showPaymentPanel">Pokaż rodzicom informacje o płatnościach (podsumowanie miesiąca)</label>
          <div class="toggle-group">
            <label class="toggle">
              <input
                type="checkbox"
                id="showPaymentPanel"
                [(ngModel)]="showPaymentPanel"
                (change)="saveShowPaymentPanel()"
              />
              <span class="toggle-slider"></span>
            </label>
            <span class="toggle-label">{{ showPaymentPanel ? 'Widoczny' : 'Ukryty' }}</span>
          </div>
        </div>
      </section>

      @if (saveSuccess()) {
        <div class="toast success">✓ Zapisano pomyślnie</div>
      }

      <section class="settings-section">
        <h2>🎉 Dni wolne (święta)</h2>
        <p class="section-description">
          Dodaj dni wolne od pracy (święta, dni wolne). W te dni posiłki nie będą zamawiane.
          Deadline odwołania dla dnia po święcie będzie przesunięty na ostatni dzień roboczy.
        </p>
        <div class="holiday-form">
          <input
            type="date"
            [(ngModel)]="newHolidayDate"
            class="holiday-input"
            placeholder="Data"
          />
          <input
            type="text"
            [(ngModel)]="newHolidayName"
            class="holiday-name-input"
            placeholder="Nazwa (np. Boże Narodzenie)"
          />
          <button 
            class="btn primary" 
            (click)="addHoliday()" 
            [disabled]="!newHolidayDate || !newHolidayName"
          >
            ➕ Dodaj
          </button>
        </div>
        @if (holidays().length > 0) {
          <ul class="holidays-list">
            @for (holiday of holidays(); track holiday.date) {
              <li class="holiday-item">
                <div class="holiday-info">
                  <span class="holiday-date">{{ formatHolidayDate(holiday.date) }}</span>
                  <span class="holiday-name">{{ holiday.name }}</span>
                </div>
                <button class="btn small danger" (click)="removeHoliday(holiday.date)">❌</button>
              </li>
            }
          </ul>
        } @else {
          <p class="empty-message">Brak dodanych dni wolnych</p>
        }
      </section>

      <section class="settings-section">
        <h2>Kopia zapasowa danych</h2>
        <p class="section-description">
          Eksportuj wszystkie dane (dzieci, odwołania, ustawienia) do pliku JSON.
          Możesz użyć tego pliku do przeniesienia danych na inne urządzenie.
        </p>
        <div class="action-buttons">
          <button class="btn secondary" (click)="exportData()">
            📤 Eksportuj dane (JSON)
          </button>
          <button class="btn secondary" (click)="triggerImport()">
            📥 Importuj dane
          </button>
          <input
            type="file"
            #fileInput
            accept=".json"
            style="display: none"
            (change)="importData($event)"
          />
        </div>
        @if (importError()) {
          <p class="error-message">{{ importError() }}</p>
        }
        @if (importSuccess()) {
          <p class="success-message">✓ Dane zaimportowane pomyślnie</p>
        }
      </section>

      <section class="settings-section danger-zone">
        <h2>Strefa niebezpieczna</h2>
        <p class="section-description">
          Poniższe akcje są nieodwracalne. Używaj ostrożnie.
        </p>
        <button class="btn danger" (click)="confirmClearData()">
          🗑️ Wyczyść wszystkie dane
        </button>
      </section>

      <section class="settings-section info-section">
        <h2>Informacje</h2>
        <div class="info-row">
          <span class="info-label">Wersja aplikacji</span>
          <span class="info-value">1.0.0</span>
        </div>
        <div class="info-row">
          <span class="info-label">Deadline odwołania</span>
          <span class="info-value">{{ state.settings().deadlineHour }}:00 dzień wcześniej</span>
        </div>
        <div class="info-row">
          <span class="info-label">Dni robocze</span>
          <span class="info-value">Poniedziałek - Piątek</span>
        </div>
        <div class="info-row">
          <span class="info-label">Zapisane dzieci</span>
          <span class="info-value">{{ state.children().length }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Zapisane odwołania</span>
          <span class="info-value">{{ state.cancellations().length }}</span>
        </div>
      </section>

      @if (showClearConfirm()) {
        <div class="modal-overlay" (click)="cancelClear()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>⚠️ Potwierdź usunięcie</h3>
            <p>Czy na pewno chcesz usunąć <strong>wszystkie dane</strong>?</p>
            <p class="warning">Ta operacja jest nieodwracalna! Wszystkie dzieci, odwołania i ustawienia zostaną usunięte.</p>
            <div class="modal-actions">
              <button class="btn secondary" (click)="cancelClear()">Anuluj</button>
              <button class="btn danger" (click)="clearAllData()">Usuń wszystko</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .settings-page {
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

    .settings-section {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .settings-section.danger-zone {
      border: 1px solid #ffcdd2;
    }

    .settings-section.info-section {
      background: #f8f9fa;
    }

    h2 {
      font-size: 1rem;
      margin: 0 0 1rem;
      color: #333;
    }

    .section-description {
      color: #666;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }

    .holiday-form {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    .holiday-input {
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 1rem;
      min-width: 150px;
    }

    .holiday-name-input {
      flex: 1;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 1rem;
      min-width: 200px;
    }

    .holidays-list {
      list-style: none;
      padding: 0;
      margin: 0;
      max-height: 300px;
      overflow-y: auto;
    }

    .holiday-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      border-bottom: 1px solid #eee;
      gap: 1rem;
    }

    .holiday-item:last-child {
      border-bottom: none;
    }

    .holiday-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .holiday-date {
      text-transform: capitalize;
      font-size: 0.875rem;
      color: #666;
    }

    .holiday-name {
      font-weight: 500;
      font-size: 1rem;
      color: #333;
    }

    .empty-message {
      color: #999;
      font-style: italic;
      text-align: center;
      padding: 1rem;
    }

    .setting-row {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .setting-row label {
      font-size: 0.875rem;
      color: #666;
    }

    .input-group {
      display: flex;
      gap: 0.5rem;
    }

    .input-group input {
      flex: 1;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 1rem;
    }

    .input-group input:focus {
      outline: none;
      border-color: #4CAF50;
    }

    .toggle-group {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .toggle {
      position: relative;
      display: inline-block;
      width: 50px;
      height: 28px;
    }

    .toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: 0.3s;
      border-radius: 28px;
    }

    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 20px;
      width: 20px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: 0.3s;
      border-radius: 50%;
    }

    .toggle input:checked + .toggle-slider {
      background-color: #4CAF50;
    }

    .toggle input:checked + .toggle-slider:before {
      transform: translateX(22px);
    }

    .toggle-label {
      font-weight: 500;
      color: #333;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn.primary {
      background: #4CAF50;
      color: white;
    }

    .btn.primary:hover:not(:disabled) {
      background: #43a047;
    }

    .btn.primary:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .btn.secondary {
      background: #f0f0f0;
      color: #333;
    }

    .btn.secondary:hover {
      background: #e0e0e0;
    }

    .btn.danger {
      background: #f44336;
      color: white;
    }

    .btn.danger:hover {
      background: #d32f2f;
    }

    .action-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .success-message {
      color: #4CAF50;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }

    .error-message {
      color: #f44336;
      font-size: 0.875rem;
      margin-top: 0.5rem;
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

    .info-label {
      color: #666;
      font-size: 0.875rem;
    }

    .info-value {
      font-weight: 500;
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      max-width: 400px;
      margin: 1rem;
    }

    .modal h3 {
      margin: 0 0 1rem;
    }

    .modal .warning {
      color: #f44336;
      font-size: 0.875rem;
    }

    .modal-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      margin-top: 1.5rem;
    }
  `]
})
export class SettingsComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  state = inject(AppState);
  private dateService = inject(DateService);

  mealRate = this.state.settings().globalMealRate;
  deadlineHour = this.state.settings().deadlineHour;
  showPaymentPanel = this.state.settings().showPaymentPanel;
  adminPin = '';
  newHolidayDate = '';
  newHolidayName = '';
  hours = Array.from({ length: 19 }, (_, i) => i + 5); // 5-23
  
  private _isSaving = signal(false);
  private _saveSuccess = signal(false);
  private _importError = signal('');
  private _importSuccess = signal(false);
  private _showClearConfirm = signal(false);

  isSaving = this._isSaving.asReadonly();
  saveSuccess = this._saveSuccess.asReadonly();
  importError = this._importError.asReadonly();
  importSuccess = this._importSuccess.asReadonly();
  showClearConfirm = this._showClearConfirm.asReadonly();

  holidays = computed(() => {
    const settings = this.state.settings();
    return (settings.holidays || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  });

  formatHolidayDate(dateStr: string): string {
    const date = this.dateService.parseISODate(dateStr);
    return this.dateService.formatPolish(date, 'EEEE, d MMMM yyyy');
  }

  async addHoliday() {
    if (!this.newHolidayDate || !this.newHolidayName) return;
    await this.state.addHoliday(this.newHolidayDate, this.newHolidayName.trim());
    this.newHolidayDate = '';
    this.newHolidayName = '';
    this._saveSuccess.set(true);
    setTimeout(() => this._saveSuccess.set(false), 3000);
  }

  async removeHoliday(date: string) {
    await this.state.removeHoliday(date);
  }

  async saveMealRate() {
    if (this.mealRate < 0) return;

    this._isSaving.set(true);
    this._saveSuccess.set(false);

    try {
      await this.state.updateMealRate(this.mealRate);
      this._saveSuccess.set(true);
      setTimeout(() => this._saveSuccess.set(false), 3000);
    } finally {
      this._isSaving.set(false);
    }
  }

  async saveDeadlineHour() {
    this._isSaving.set(true);
    this._saveSuccess.set(false);

    try {
      await this.state.updateDeadlineHour(this.deadlineHour);
      this._saveSuccess.set(true);
      setTimeout(() => this._saveSuccess.set(false), 3000);
    } finally {
      this._isSaving.set(false);
    }
  }

  async saveAdminPin() {
    if (!this.adminPin || this.adminPin.length < 4) return;

    this._isSaving.set(true);
    this._saveSuccess.set(false);

    try {
      await this.state.updateAdminPin(this.adminPin);
      this.adminPin = '';
      this._saveSuccess.set(true);
      setTimeout(() => this._saveSuccess.set(false), 3000);
    } finally {
      this._isSaving.set(false);
    }
  }

  async saveShowPaymentPanel() {
    this._isSaving.set(true);
    this._saveSuccess.set(false);

    try {
      await this.state.updateShowPaymentPanel(this.showPaymentPanel);
      this._saveSuccess.set(true);
      setTimeout(() => this._saveSuccess.set(false), 3000);
    } finally {
      this._isSaving.set(false);
    }
  }

  async exportData() {
    await this.state.exportData();
  }

  triggerImport() {
    this.fileInput.nativeElement.click();
  }

  async importData(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this._importError.set('');
    this._importSuccess.set(false);

    try {
      await this.state.importData(file);
      this._importSuccess.set(true);
      this.mealRate = this.state.settings().globalMealRate;
      setTimeout(() => this._importSuccess.set(false), 3000);
    } catch (e) {
      this._importError.set('Nie udało się zaimportować danych. Upewnij się, że plik jest poprawny.');
    }

    // Reset file input
    input.value = '';
  }

  confirmClearData() {
    this._showClearConfirm.set(true);
  }

  cancelClear() {
    this._showClearConfirm.set(false);
  }

  async clearAllData() {
    // Import empty data to clear everything
    const emptyData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      children: [],
      cancellations: [],
      settings: {
        id: 'app-settings',
        globalMealRate: 8.5,
        deadlineHour: 17
      }
    };

    await this.state.importData(new File([JSON.stringify(emptyData)], 'empty.json', { type: 'application/json' }));
    this.mealRate = 8.5;
    this._showClearConfirm.set(false);
  }
}
