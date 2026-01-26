import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AppState } from '../../state/app.state';
import { Child } from '../../shared/models';

@Component({
  selector: 'app-children',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="children-page">
      <header class="page-header">
        <a routerLink="/" class="back-link">← Powrót</a>
        <h1>👶 Zarządzanie Dziećmi</h1>
      </header>

      <section class="add-child-section">
        <h2>Dodaj dziecko</h2>
        <form class="add-form" (ngSubmit)="addChild()">
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
            <label for="identifier">Identyfikator (opcjonalnie)</label>
            <input 
              type="text" 
              id="identifier" 
              [(ngModel)]="newIdentifier" 
              name="identifier"
              placeholder="np. 12, A5"
            />
          </div>
          <button type="submit" class="btn primary" [disabled]="!newNickname.trim()">
            ➕ Dodaj
          </button>
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
                    <button class="btn small" (click)="saveEdit(child.id)">💾</button>
                    <button class="btn small secondary" (click)="cancelEdit()">✕</button>
                  </div>
                } @else {
                  <div class="child-info">
                    <span class="child-nickname">{{ child.nickname }}</span>
                    @if (child.identifier) {
                      <span class="child-identifier">#{{ child.identifier }}</span>
                    }
                    @if (!child.isActive) {
                      <span class="inactive-badge">Nieaktywne</span>
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
    }

    .child-item:last-child {
      border-bottom: none;
    }

    .child-item.inactive {
      opacity: 0.6;
    }

    .child-info {
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
      gap: 0.5rem;
      width: 100%;
    }

    .edit-form input {
      flex: 1;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 6px;
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

  newNickname = '';
  newIdentifier = '';
  error = '';

  editingId: string | null = null;
  editNickname = '';
  editIdentifier = '';

  showDeleteConfirm = false;
  childToDelete: Child | null = null;

  async addChild() {
    if (!this.newNickname.trim()) return;

    try {
      await this.state.addChild(this.newNickname.trim(), this.newIdentifier.trim() || undefined);
      this.newNickname = '';
      this.newIdentifier = '';
      this.error = '';
    } catch (e) {
      this.error = 'Nie udało się dodać dziecka.';
    }
  }

  startEdit(child: Child) {
    this.editingId = child.id;
    this.editNickname = child.nickname;
    this.editIdentifier = child.identifier || '';
  }

  async saveEdit(id: string) {
    if (!this.editNickname.trim()) return;

    await this.state.updateChild(id, this.editNickname.trim(), this.editIdentifier.trim() || undefined);
    this.cancelEdit();
  }

  cancelEdit() {
    this.editingId = null;
    this.editNickname = '';
    this.editIdentifier = '';
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
