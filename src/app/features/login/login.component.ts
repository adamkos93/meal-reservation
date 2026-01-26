import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="login-header">
          <span class="logo">🍽️</span>
          <h1>Odwoływanie Posiłków</h1>
          <p class="subtitle">Wybierz sposób logowania</p>
        </div>

        <div class="role-selector">
          <button
            class="role-btn"
            [class.active]="selectedRole() === 'admin'"
            (click)="selectRole('admin')"
          >
            <span class="role-icon">👨‍💼</span>
            <span class="role-name">Administrator</span>
          </button>
          <button
            class="role-btn"
            [class.active]="selectedRole() === 'parent'"
            (click)="selectRole('parent')"
          >
            <span class="role-icon">👪</span>
            <span class="role-name">Rodzic</span>
          </button>
        </div>

        @if (selectedRole() === 'admin') {
          <form class="login-form" (ngSubmit)="loginAdmin()">
            <div class="form-group">
              <label for="pin">PIN administratora</label>
              <input
                type="password"
                id="pin"
                [(ngModel)]="adminPin"
                name="pin"
                placeholder="Wprowadź PIN"
                maxlength="10"
                autocomplete="off"
              />
            </div>
            <button type="submit" class="btn primary" [disabled]="!adminPin || isLoading()">
              @if (isLoading()) {
                Logowanie...
              } @else {
                Zaloguj się
              }
            </button>
          </form>
        }

        @if (selectedRole() === 'parent') {
          <form class="login-form" (ngSubmit)="loginParent()">
            <div class="form-group">
              <label for="accessCode">Kod dostępu dziecka</label>
              <input
                type="text"
                id="accessCode"
                [(ngModel)]="accessCode"
                name="accessCode"
                placeholder="Wprowadź kod"
                maxlength="20"
                autocomplete="off"
              />
            </div>
            <button type="submit" class="btn primary" [disabled]="!accessCode || isLoading()">
              @if (isLoading()) {
                Logowanie...
              } @else {
                Zaloguj się
              }
            </button>
          </form>
        }

        @if (error()) {
          <div class="error-message">
            <span>⚠️</span> {{ error() }}
          </div>
        }

        <div class="login-footer">
          <p>Domyślny PIN admina: <code>1234</code></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .login-card {
      background: white;
      border-radius: 20px;
      padding: 2.5rem;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .logo {
      font-size: 3rem;
      display: block;
      margin-bottom: 0.5rem;
    }

    .login-header h1 {
      font-size: 1.5rem;
      margin: 0;
      color: #1a1a2e;
    }

    .subtitle {
      color: #666;
      margin: 0.5rem 0 0;
      font-size: 0.875rem;
    }

    .role-selector {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .role-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1.25rem 1rem;
      border: 2px solid #eee;
      border-radius: 12px;
      background: white;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .role-btn:hover {
      border-color: #ddd;
      background: #fafafa;
    }

    .role-btn.active {
      border-color: #4CAF50;
      background: #e8f5e9;
    }

    .role-icon {
      font-size: 2rem;
    }

    .role-name {
      font-weight: 500;
      color: #333;
    }

    .login-form {
      margin-bottom: 1rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #333;
    }

    .form-group input {
      width: 100%;
      padding: 0.875rem 1rem;
      border: 2px solid #eee;
      border-radius: 10px;
      font-size: 1rem;
      transition: border-color 0.2s;
    }

    .form-group input:focus {
      outline: none;
      border-color: #4CAF50;
    }

    .btn {
      width: 100%;
      padding: 0.875rem;
      border: none;
      border-radius: 10px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn.primary {
      background: #4CAF50;
      color: white;
    }

    .btn.primary:hover:not(:disabled) {
      background: #43a047;
      transform: translateY(-1px);
    }

    .btn.primary:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
    }

    .error-message {
      background: #ffebee;
      color: #c62828;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1rem;
    }

    .login-footer {
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid #eee;
      text-align: center;
    }

    .login-footer p {
      color: #999;
      font-size: 0.75rem;
      margin: 0;
    }

    .login-footer code {
      background: #f5f5f5;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      font-family: monospace;
    }
  `]
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  selectedRole = signal<'admin' | 'parent' | null>(null);
  error = signal('');
  isLoading = signal(false);

  adminPin = '';
  accessCode = '';

  selectRole(role: 'admin' | 'parent') {
    this.selectedRole.set(role);
    this.error.set('');
  }

  async loginAdmin() {
    if (!this.adminPin) return;

    this.isLoading.set(true);
    this.error.set('');

    try {
      const success = await this.auth.loginAsAdmin(this.adminPin);
      if (success) {
        this.router.navigate(['/admin']);
      } else {
        this.error.set('Nieprawidłowy PIN');
      }
    } catch (e) {
      this.error.set('Wystąpił błąd. Spróbuj ponownie.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loginParent() {
    if (!this.accessCode) return;

    this.isLoading.set(true);
    this.error.set('');

    try {
      const success = await this.auth.loginAsParent(this.accessCode.trim());
      if (success) {
        this.router.navigate(['/parent']);
      } else {
        this.error.set('Nieprawidłowy kod dostępu lub dziecko jest nieaktywne');
      }
    } catch (e) {
      this.error.set('Wystąpił błąd. Spróbuj ponownie.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
