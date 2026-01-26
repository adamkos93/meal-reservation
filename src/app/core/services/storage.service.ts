import { Injectable } from '@angular/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Child, MealCancellation, AppSettings, DEFAULT_SETTINGS } from '../../shared/models';

interface MealReservationDB extends DBSchema {
  children: {
    key: string;
    value: Child;
    indexes: { 'by-nickname': string };
  };
  cancellations: {
    key: string;
    value: MealCancellation;
    indexes: { 'by-date': string; 'by-child': string };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
}

export interface ExportData {
  version: number;
  exportedAt: string;
  children: Child[];
  cancellations: MealCancellation[];
  settings: AppSettings;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private db: IDBPDatabase<MealReservationDB> | null = null;
  private readonly DB_NAME = 'meal-reservation-db';
  private readonly DB_VERSION = 1;

  async initialize(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<MealReservationDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Children store
        if (!db.objectStoreNames.contains('children')) {
          const childrenStore = db.createObjectStore('children', { keyPath: 'id' });
          childrenStore.createIndex('by-nickname', 'nickname');
        }

        // Cancellations store
        if (!db.objectStoreNames.contains('cancellations')) {
          const cancellationsStore = db.createObjectStore('cancellations', { keyPath: 'id' });
          cancellationsStore.createIndex('by-date', 'date');
          cancellationsStore.createIndex('by-child', 'childId');
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      }
    });

    // Initialize default settings if not exists
    const settings = await this.getSettings();
    if (!settings) {
      await this.saveSettings(DEFAULT_SETTINGS);
    }
  }

  // Children CRUD
  async getAllChildren(): Promise<Child[]> {
    await this.initialize();
    return this.db!.getAll('children');
  }

  async getChild(id: string): Promise<Child | undefined> {
    await this.initialize();
    return this.db!.get('children', id);
  }

  async saveChild(child: Child): Promise<void> {
    await this.initialize();
    await this.db!.put('children', child);
  }

  async deleteChild(id: string): Promise<void> {
    await this.initialize();
    await this.db!.delete('children', id);
    // Also delete all cancellations for this child
    const cancellations = await this.getCancellationsByChild(id);
    for (const c of cancellations) {
      await this.db!.delete('cancellations', c.id);
    }
  }

  // Cancellations CRUD
  async getAllCancellations(): Promise<MealCancellation[]> {
    await this.initialize();
    return this.db!.getAll('cancellations');
  }

  async getCancellationsByDate(date: string): Promise<MealCancellation[]> {
    await this.initialize();
    return this.db!.getAllFromIndex('cancellations', 'by-date', date);
  }

  async getCancellationsByChild(childId: string): Promise<MealCancellation[]> {
    await this.initialize();
    return this.db!.getAllFromIndex('cancellations', 'by-child', childId);
  }

  async saveCancellation(cancellation: MealCancellation): Promise<void> {
    await this.initialize();
    await this.db!.put('cancellations', cancellation);
  }

  async deleteCancellation(id: string): Promise<void> {
    await this.initialize();
    await this.db!.delete('cancellations', id);
  }

  async findCancellation(childId: string, date: string): Promise<MealCancellation | undefined> {
    await this.initialize();
    const cancellations = await this.getCancellationsByDate(date);
    return cancellations.find(c => c.childId === childId);
  }

  // Settings
  async getSettings(): Promise<AppSettings | undefined> {
    await this.initialize();
    return this.db!.get('settings', 'app-settings');
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await this.initialize();
    await this.db!.put('settings', settings);
  }

  // Export/Import
  async exportAllData(): Promise<ExportData> {
    await this.initialize();
    const children = await this.getAllChildren();
    const cancellations = await this.getAllCancellations();
    const settings = await this.getSettings() || DEFAULT_SETTINGS;

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      children,
      cancellations,
      settings
    };
  }

  async importData(data: ExportData): Promise<void> {
    await this.initialize();

    // Clear existing data
    const tx = this.db!.transaction(['children', 'cancellations', 'settings'], 'readwrite');
    await tx.objectStore('children').clear();
    await tx.objectStore('cancellations').clear();
    await tx.objectStore('settings').clear();
    await tx.done;

    // Import new data
    for (const child of data.children) {
      await this.saveChild(child);
    }
    for (const cancellation of data.cancellations) {
      await this.saveCancellation(cancellation);
    }
    await this.saveSettings(data.settings);
  }

  // CSV Export for monthly report
  generateCSV(headers: string[], rows: string[][]): string {
    const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    const headerLine = headers.join(';');
    const dataLines = rows.map(row => row.join(';'));
    return BOM + [headerLine, ...dataLines].join('\n');
  }

  downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
