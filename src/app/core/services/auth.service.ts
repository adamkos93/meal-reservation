import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../../shared/models';
import { FirestoreService } from './firestore.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private storage = inject(FirestoreService);
  private router = inject(Router);

  private readonly _currentUser = signal<User | null>(null);
  readonly currentUser = this._currentUser.asReadonly();

  async initialize(): Promise<void> {
    await this.storage.initialize();
    const saved = sessionStorage.getItem('currentUser');
    if (saved) {
      try {
        this._currentUser.set(JSON.parse(saved));
      } catch {
        sessionStorage.removeItem('currentUser');
      }
    }
  }

  async loginAsAdmin(pin: string): Promise<boolean> {
    await this.storage.initialize();
    const settings = await this.storage.getSettings();
    const adminPin = settings?.adminPin || '1234'; // Fallback to default PIN
    if (adminPin === pin) {
      const user: User = { role: 'admin' };
      this._currentUser.set(user);
      sessionStorage.setItem('currentUser', JSON.stringify(user));
      return true;
    }
    return false;
  }

  async loginAsParent(accessCode: string): Promise<boolean> {
    await this.storage.initialize();
    const children = await this.storage.getAllChildren();
    const child = children.find(c => c.accessCode === accessCode && c.isActive);
    if (child) {
      const user: User = {
        role: 'parent',
        childId: child.id,
        childNickname: child.nickname
      };
      this._currentUser.set(user);
      sessionStorage.setItem('currentUser', JSON.stringify(user));
      return true;
    }
    return false;
  }

  logout(): void {
    this._currentUser.set(null);
    sessionStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return this._currentUser() !== null;
  }

  isAdmin(): boolean {
    return this._currentUser()?.role === 'admin';
  }

  isParent(): boolean {
    return this._currentUser()?.role === 'parent';
  }

  getChildId(): string | undefined {
    return this._currentUser()?.childId;
  }

  getChildNickname(): string | undefined {
    return this._currentUser()?.childNickname;
  }
}
