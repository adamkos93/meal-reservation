export interface Child {
  id: string;
  nickname: string;
  identifier: string | null;
  accessCode: string; // Kod dostępu dla rodzica
  isActive: boolean;
  createdAt: string;
}

export interface CreateChildDto {
  nickname: string;
  identifier?: string | null;
  accessCode: string;
}
