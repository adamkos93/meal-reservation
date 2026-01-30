import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AppState } from '../../state/app.state';
import { DateService } from '../../core/services/date.service';
import { Child } from '../../shared/models';

@Component({
  selector: 'app-children',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="children-page">
      <header class="page-header">
        <a routerLink="/admin" class="back-link">← Powrót</a>
        <h1>👶 Zarządzanie Dziećmi</h1>
      </header>

      <section class="add-child-section">
        <h2>Dodaj dziecko</h2>
        <form class="add-form" (ngSubmit)="addChild()">
          <div class="form-row">
            <div class="form-group">
              <label for="nickname">Nick / Imię *</label>
              <input
                type="text"
                id="nickname"
                [(ngModel)]="newNickname"
                name="nickname"
                placeholder="np. Zuzia, Dziecko1"
                required
              />
            </div>
            <div class="form-group">
              <label for="identifier">Identyfikator</label>
              <input
                type="text"
                id="identifier"
                [(ngModel)]="newIdentifier"
                name="identifier"
                placeholder="np. 12, A5"
              />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="accessCode">Kod dostępu dla rodzica *</label>
              <input
                type="text"
                id="accessCode"
                [(ngModel)]="newAccessCode"
                name="accessCode"
                placeholder="np. zuzia2024"
                required
              />
            </div>
          </div>
          <div class="attendance-range-section">
            <label class="section-label">📅 Okres uczęszczania <span class="optional">(opcjonalnie)</span></label>
            <div class="date-range-row">
              <div class="date-field">
                <span class="date-label">Od</span>
                <input
                  type="date"
                  id="startDate"
                  [(ngModel)]="newStartDate"
                  name="startDate"
                  class="date-input"
                />
                @if (newStartDate) {
                  <button type="button" class="clear-date-btn" (click)="newStartDate = ''" title="Wyczyść">✕</button>
                }
              </div>
              <span class="date-separator">→</span>
              <div class="date-field">
                <span class="date-label">Do</span>
                <input
                  type="date"
                  id="endDate"
                  [(ngModel)]="newEndDate"
                  name="endDate"
                  [min]="newStartDate"
                  class="date-input"
                />
                @if (newEndDate) {
                  <button type="button" class="clear-date-btn" (click)="newEndDate = ''" title="Wyczyść">✕</button>
                }
              </div>
            </div>
            <p class="date-hint">Pozostaw puste, jeśli dziecko uczęszcza bez ograniczeń czasowych</p>
          </div>
          @if (dateRangeError) {
            <p class="error-message">{{ dateRangeError }}</p>
          }
          <div class="form-row">
            <button type="submit" class="btn primary full-width" [disabled]="!newNickname.trim() || !newAccessCode.trim()">
              ➕ Dodaj
            </button>
          </div>
        </form>
        @if (error) {
          <p class="error-message">{{ error }}</p>
        }
      </section>

      <section class="children-list-section">
        <h2>Lista dzieci ({{ state.children().length }})</h2>

        @if (state.children().length === 0) {
          <p class="empty-message">Brak dodanych dzieci. Dodaj pierwsze dziecko powyżej.</p>
        } @else {
          <ul class="children-list">
            @for (child of state.children(); track child.id) {
              <li class="child-item" [class.inactive]="!child.isActive">
                @if (editingId === child.id) {
                  <div class="edit-form">
                    <div class="edit-row">
                      <input
                        type="text"
                        [(ngModel)]="editNickname"
                        placeholder="Nick"
                      />
                      <input
                        type="text"
                        [(ngModel)]="editIdentifier"
                        placeholder="ID"
                      />
                      <input
                        type="text"
                        [(ngModel)]="editAccessCode"
                        placeholder="Kod dostępu"
                      />
                    </div>
                    <div class="edit-date-section">
                      <span class="edit-date-label">📅 Okres:</span>
                      <div class="edit-date-row">
                        <div class="edit-date-field">
                          <input type="date" [(ngModel)]="editStartDate" placeholder="Od" />
                          @if (editStartDate) {
                            <button type="button" class="clear-date-btn small" (click)="editStartDate = ''">✕</button>
                          }
                        </div>
                        <span class="edit-date-arrow">→</span>
                        <div class="edit-date-field">
                          <input type="date" [(ngModel)]="editEndDate" [min]="editStartDate" placeholder="Do" />
                          @if (editEndDate) {
                            <button type="button" class="clear-date-btn small" (click)="editEndDate = ''">✕</button>
                          }
                        </div>
                      </div>
                    </div>
                    @if (editDateRangeError) {
                      <p class="error-message small">{{ editDateRangeError }}</p>
                    }
                    <div class="edit-actions">
                      <button class="btn small" (click)="saveEdit(child.id)">💾</button>
                      <button class="btn small secondary" (click)="cancelEdit()">✕</button>
                    </div>
                  </div>
                } @else {
                  <div class="child-info">
                    <div class="child-main">
                      <span class="child-nickname">{{ child.nickname }}</span>
                      @if (child.identifier) {
                        <span class="child-identifier">#{{ child.identifier }}</span>
                      }
                      @if (!child.isActive) {
                        <span class="inactive-badge">Nieaktywne</span>
                      }
                    </div>
                    <div class="child-access-code">
                      Kod: <code>{{ child.accessCode }}</code>
                    </div>
                    @if (child.startDate || child.endDate) {
                      <div class="child-dates">
                        <span class="dates-icon">📅</span>
                        <span class="dates-range">
                          @if (child.startDate && child.endDate) {
                            {{ formatDate(child.startDate) }} → {{ formatDate(child.endDate) }}
                          } @else if (child.startDate) {
                            od {{ formatDate(child.startDate) }}
                          } @else if (child.endDate) {
                            do {{ formatDate(child.endDate) }}
                          }
                        </span>
                      </div>
                    }
                  </div>
                  <div class="child-actions">
                    <button
                      class="btn small"
                      (click)="startEdit(child)"
                      title="Edytuj"
                    >
                      ✏️
                    </button>
                    <button
                      class="btn small"
                      (click)="toggleActive(child.id)"
                      [title]="child.isActive ? 'Dezaktywuj' : 'Aktywuj'"
                    >
                      {{ child.isActive ? '🔕' : '🔔' }}
                    </button>
                    <button 
                      class="btn small danger" 
                      (click)="confirmDelete(child)"
                      title="Usuń"
                    >
                      🗑️
                    </button>
                  </div>
                }
              </li>
            }
          </ul>
        }
      </section>

      @if (showDeleteConfirm && childToDelete) {
        <div class="modal-overlay" (click)="cancelDelete()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>Potwierdź usunięcie</h3>
            <p>Czy na pewno chcesz usunąć <strong>{{ childToDelete.nickname }}</strong>?</p>
            <p class="warning">Spowoduje to również usunięcie wszystkich odwołań dla tego dziecka.</p>
            <div class="modal-actions">
              <button class="btn secondary" (click)="cancelDelete()">Anuluj</button>
              <button class="btn danger" (click)="deleteChild()">Usuń</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .children-page {
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

    .back-link:hover {
      color: #333;
    }

    .page-header h1 {
      margin: 0.5rem 0 0;
      font-size: 1.5rem;
    }

    .add-child-section, .children-list-section {
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

    .add-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-row {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: flex-end;
    }

    .form-group {
      flex: 1;
      min-width: 150px;
    }

    .form-group label {
      display: block;
      font-size: 0.75rem;
      color: #666;
      margin-bottom: 0.25rem;
    }

    .form-group input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 1rem;
    }

    .form-group input:focus {
      outline: none;
      border-color: #4CAF50;
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

    .btn.danger {
      background: #f44336;
      color: white;
    }

    .btn.small {
      padding: 0.5rem;
      font-size: 0.875rem;
    }

    .error-message {
      color: #f44336;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }

    .empty-message {
      color: #666;
      text-align: center;
      padding: 2rem;
    }

    .children-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .child-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid #eee;
      gap: 1rem;
    }

    .child-item:last-child {
      border-bottom: none;
    }

    .child-item.inactive {
      opacity: 0.6;
    }

    .child-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .child-main {
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

    .child-access-code {
      font-size: 0.75rem;
      color: #888;
    }

    .child-access-code code {
      background: #f5f5f5;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      font-family: monospace;
    }

    .inactive-badge {
      background: #ff9800;
      color: white;
      font-size: 0.625rem;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }

    .child-actions {
      display: flex;
      gap: 0.5rem;
    }

    .edit-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      width: 100%;
    }

    .edit-row {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .edit-row input[type="text"] {
      flex: 1;
      min-width: 80px;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 6px;
    }

    /* Attendance range section - Add form */
    .attendance-range-section {
      background: #f8f9fa;
      border-radius: 10px;
      padding: 1rem;
      border: 1px dashed #ddd;
    }

    .section-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: #333;
      margin-bottom: 0.75rem;
    }

    .section-label .optional {
      font-weight: 400;
      color: #999;
      font-size: 0.75rem;
    }

    .date-range-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .date-field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      position: relative;
      flex: 1;
      min-width: 140px;
    }

    .date-label {
      font-size: 0.7rem;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .date-input {
      padding: 0.625rem 2rem 0.625rem 0.75rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 0.9rem;
      background: white;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .date-input:focus {
      outline: none;
      border-color: #4CAF50;
      box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
    }

    .clear-date-btn {
      position: absolute;
      right: 0.5rem;
      bottom: 0.5rem;
      background: #eee;
      border: none;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      font-size: 0.7rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #666;
      transition: background 0.2s;
    }

    .clear-date-btn:hover {
      background: #ddd;
      color: #333;
    }

    .clear-date-btn.small {
      width: 18px;
      height: 18px;
      font-size: 0.6rem;
    }

    .date-separator {
      font-size: 1.25rem;
      color: #999;
      margin-top: 1rem;
    }

    .date-hint {
      font-size: 0.75rem;
      color: #888;
      margin: 0.75rem 0 0;
      font-style: italic;
    }

    /* Edit form date section */
    .edit-date-section {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 0.75rem;
      width: 100%;
    }

    .edit-date-label {
      font-size: 0.75rem;
      color: #666;
      display: block;
      margin-bottom: 0.5rem;
    }

    .edit-date-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .edit-date-field {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      position: relative;
      flex: 1;
      min-width: 120px;
    }

    .edit-date-field input[type="date"] {
      flex: 1;
      padding: 0.5rem 1.75rem 0.5rem 0.5rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 0.8rem;
      background: white;
    }

    .edit-date-field input[type="date"]:focus {
      outline: none;
      border-color: #4CAF50;
    }

    .edit-date-arrow {
      color: #999;
      font-size: 1rem;
    }

    .edit-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    .error-message.small {
      font-size: 0.75rem;
      margin: 0;
    }

    /* Child dates display */
    .child-dates {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: #666;
      background: #e3f2fd;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      width: fit-content;
      margin-top: 0.25rem;
    }

    .dates-icon {
      font-size: 0.7rem;
    }

    .dates-range {
      font-size: 0.7rem;
      color: #666;
      margin-top: 0.25rem;
    }

    .btn.full-width {
      width: 100%;
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
export class ChildrenComponent {
  state = inject(AppState);
  private dateService = inject(DateService);

  newNickname = '';
  newIdentifier = '';
  newAccessCode = '';
  newStartDate = '';
  newEndDate = '';
  error = '';
  dateRangeError = '';

  editingId: string | null = null;
  editNickname = '';
  editIdentifier = '';
  editAccessCode = '';
  editStartDate = '';
  editEndDate = '';
  editDateRangeError = '';

  showDeleteConfirm = false;
  childToDelete: Child | null = null;

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = this.dateService.parseISODate(dateStr);
    return this.dateService.formatPolish(date, 'd MMM yyyy');
  }

  validateDateRange(startDate: string, endDate: string): boolean {
    if (startDate && endDate && endDate < startDate) {
      return false;
    }
    return true;
  }

  async addChild() {
    if (!this.newNickname.trim() || !this.newAccessCode.trim()) return;

    this.dateRangeError = '';
    if (!this.validateDateRange(this.newStartDate, this.newEndDate)) {
      this.dateRangeError = 'Data "do" musi być późniejsza niż data "od"';
      return;
    }

    try {
      await this.state.addChild(
        this.newNickname.trim(),
        this.newIdentifier.trim() || undefined,
        this.newAccessCode.trim(),
        this.newStartDate || null,
        this.newEndDate || null
      );
      this.newNickname = '';
      this.newIdentifier = '';
      this.newAccessCode = '';
      this.newStartDate = '';
      this.newEndDate = '';
      this.error = '';
    } catch (e) {
      console.error('Error adding child:', e);
      this.error = 'Nie udało się dodać dziecka. Sprawdź konsolę.';
    }
  }

  startEdit(child: Child) {
    this.editingId = child.id;
    this.editNickname = child.nickname;
    this.editIdentifier = child.identifier || '';
    this.editAccessCode = child.accessCode;
    this.editStartDate = child.startDate || '';
    this.editEndDate = child.endDate || '';
    this.editDateRangeError = '';
  }

  async saveEdit(id: string) {
    if (!this.editNickname.trim() || !this.editAccessCode.trim()) return;

    this.editDateRangeError = '';
    if (!this.validateDateRange(this.editStartDate, this.editEndDate)) {
      this.editDateRangeError = 'Data "do" musi być późniejsza niż data "od"';
      return;
    }

    await this.state.updateChild(
      id,
      this.editNickname.trim(),
      this.editIdentifier.trim() || undefined,
      this.editAccessCode.trim(),
      this.editStartDate || null,
      this.editEndDate || null
    );
    this.cancelEdit();
  }

  cancelEdit() {
    this.editingId = null;
    this.editNickname = '';
    this.editIdentifier = '';
    this.editAccessCode = '';
    this.editStartDate = '';
    this.editEndDate = '';
    this.editDateRangeError = '';
  }

  async toggleActive(id: string) {
    await this.state.toggleChildActive(id);
  }

  confirmDelete(child: Child) {
    this.childToDelete = child;
    this.showDeleteConfirm = true;
  }

  cancelDelete() {
    this.childToDelete = null;
    this.showDeleteConfirm = false;
  }

  async deleteChild() {
    if (this.childToDelete) {
      await this.state.deleteChild(this.childToDelete.id);
      this.cancelDelete();
    }
  }
}
