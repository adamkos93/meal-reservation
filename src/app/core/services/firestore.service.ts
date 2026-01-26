import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import { environment } from '../../../environments/environment';
import { Child, MealCancellation, AppSettings, DEFAULT_SETTINGS } from '../../shared/models';

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
export class FirestoreService {
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      this.app = initializeApp(environment.firebase);
      this.db = getFirestore(this.app);
      
      // Initialize default settings if not exists
      const settings = await this.getSettings();
      if (!settings) {
        await this.saveSettings(DEFAULT_SETTINGS);
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Firebase initialization error:', error);
      throw error;
    }
  }

  // Children CRUD
  async getAllChildren(): Promise<Child[]> {
    await this.initialize();
    const querySnapshot = await getDocs(collection(this.db!, 'children'));
    return querySnapshot.docs.map(doc => doc.data() as Child);
  }

  async getChild(id: string): Promise<Child | undefined> {
    await this.initialize();
    const docRef = doc(this.db!, 'children', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as Child) : undefined;
  }

  async saveChild(child: Child): Promise<void> {
    await this.initialize();
    const docRef = doc(this.db!, 'children', child.id);
    await setDoc(docRef, child);
  }

  async deleteChild(id: string): Promise<void> {
    await this.initialize();
    
    // Delete child document
    await deleteDoc(doc(this.db!, 'children', id));
    
    // Delete all cancellations for this child
    const cancellations = await this.getCancellationsByChild(id);
    const batch = writeBatch(this.db!);
    for (const c of cancellations) {
      batch.delete(doc(this.db!, 'cancellations', c.id));
    }
    await batch.commit();
  }

  // Cancellations CRUD
  async getAllCancellations(): Promise<MealCancellation[]> {
    await this.initialize();
    const querySnapshot = await getDocs(collection(this.db!, 'cancellations'));
    return querySnapshot.docs.map(doc => doc.data() as MealCancellation);
  }

  async getCancellationsByDate(date: string): Promise<MealCancellation[]> {
    await this.initialize();
    const q = query(collection(this.db!, 'cancellations'), where('date', '==', date));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as MealCancellation);
  }

  async getCancellationsByChild(childId: string): Promise<MealCancellation[]> {
    await this.initialize();
    const q = query(collection(this.db!, 'cancellations'), where('childId', '==', childId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as MealCancellation);
  }

  async saveCancellation(cancellation: MealCancellation): Promise<void> {
    await this.initialize();
    const docRef = doc(this.db!, 'cancellations', cancellation.id);
    await setDoc(docRef, cancellation);
  }

  async deleteCancellation(id: string): Promise<void> {
    await this.initialize();
    await deleteDoc(doc(this.db!, 'cancellations', id));
  }

  async findCancellation(childId: string, date: string): Promise<MealCancellation | undefined> {
    await this.initialize();
    const q = query(
      collection(this.db!, 'cancellations'),
      where('childId', '==', childId),
      where('date', '==', date)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty ? undefined : (querySnapshot.docs[0].data() as MealCancellation);
  }

  // Settings
  async getSettings(): Promise<AppSettings | undefined> {
    await this.initialize();
    const docRef = doc(this.db!, 'settings', 'app-settings');
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as AppSettings) : undefined;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await this.initialize();
    const docRef = doc(this.db!, 'settings', settings.id);
    await setDoc(docRef, settings);
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

  async importAllData(data: ExportData): Promise<void> {
    await this.initialize();
    
    // Clear existing data
    const existingChildren = await this.getAllChildren();
    const existingCancellations = await this.getAllCancellations();
    
    const batch = writeBatch(this.db!);
    
    // Delete existing
    for (const child of existingChildren) {
      batch.delete(doc(this.db!, 'children', child.id));
    }
    for (const cancellation of existingCancellations) {
      batch.delete(doc(this.db!, 'cancellations', cancellation.id));
    }
    
    await batch.commit();

    // Import new data
    const importBatch = writeBatch(this.db!);
    
    for (const child of data.children) {
      importBatch.set(doc(this.db!, 'children', child.id), child);
    }
    for (const cancellation of data.cancellations) {
      importBatch.set(doc(this.db!, 'cancellations', cancellation.id), cancellation);
    }
    
    // Import settings (preserve adminPin if not in import)
    const currentSettings = await this.getSettings();
    const newSettings: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...data.settings,
      adminPin: data.settings.adminPin || currentSettings?.adminPin || DEFAULT_SETTINGS.adminPin
    };
    importBatch.set(doc(this.db!, 'settings', 'app-settings'), newSettings);
    
    await importBatch.commit();
  }

  async getChildByAccessCode(accessCode: string): Promise<Child | undefined> {
    await this.initialize();
    const q = query(
      collection(this.db!, 'children'),
      where('accessCode', '==', accessCode),
      where('isActive', '==', true)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty ? undefined : (querySnapshot.docs[0].data() as Child);
  }

  // Alias for backward compatibility
  async importData(data: ExportData): Promise<void> {
    return this.importAllData(data);
  }

  // Helper methods for file operations
  generateCSV(headers: string[], rows: string[][]): string {
    const BOM = '\uFEFF';
    const headerRow = headers.join(';');
    const dataRows = rows.map(row => row.join(';')).join('\n');
    return BOM + headerRow + '\n' + dataRows;
  }

  downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
