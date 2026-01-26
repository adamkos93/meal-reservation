import { Injectable, inject } from '@angular/core';
import { StorageService } from './storage.service';
import { DateService } from './date.service';
import { Child, CreateChildDto } from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class ChildService {
  private storage = inject(StorageService);
  private dateService = inject(DateService);

  async getAllChildren(): Promise<Child[]> {
    return this.storage.getAllChildren();
  }

  async getActiveChildren(): Promise<Child[]> {
    const children = await this.storage.getAllChildren();
    return children.filter(c => c.isActive);
  }

  async getChild(id: string): Promise<Child | undefined> {
    return this.storage.getChild(id);
  }

  async createChild(dto: CreateChildDto): Promise<Child> {
    const child: Child = {
      id: crypto.randomUUID(),
      nickname: dto.nickname.trim(),
      identifier: dto.identifier?.trim() || undefined,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    await this.storage.saveChild(child);
    return child;
  }

  async updateChild(id: string, dto: Partial<CreateChildDto>): Promise<Child | undefined> {
    const child = await this.storage.getChild(id);
    if (!child) return undefined;

    const updated: Child = {
      ...child,
      nickname: dto.nickname?.trim() || child.nickname,
      identifier: dto.identifier?.trim() || child.identifier
    };
    await this.storage.saveChild(updated);
    return updated;
  }

  async toggleChildActive(id: string): Promise<Child | undefined> {
    const child = await this.storage.getChild(id);
    if (!child) return undefined;

    const updated: Child = {
      ...child,
      isActive: !child.isActive
    };
    await this.storage.saveChild(updated);
    return updated;
  }

  async deleteChild(id: string): Promise<void> {
    await this.storage.deleteChild(id);
  }

  // Validate nickname uniqueness
  async isNicknameUnique(nickname: string, excludeId?: string): Promise<boolean> {
    const children = await this.storage.getAllChildren();
    const normalized = nickname.trim().toLowerCase();
    return !children.some(
      c => c.nickname.toLowerCase() === normalized && c.id !== excludeId
    );
  }
}
