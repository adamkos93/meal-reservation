export interface Child {
  id: string;
  nickname: string;
  identifier: string | null;
  accessCode: string; // Kod dostępu dla rodzica
  isActive: boolean;
  createdAt: string;
  startDate?: string | null; // Data rozpoczęcia uczęszczania (YYYY-MM-DD)
  endDate?: string | null; // Data zakończenia uczęszczania (YYYY-MM-DD)
}

export interface CreateChildDto {
  nickname: string;
  identifier?: string | null;
  accessCode: string;
  startDate?: string | null;
  endDate?: string | null;
}
