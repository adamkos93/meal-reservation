export interface Child {
  id: string;
  nickname: string;
  identifier?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateChildDto {
  nickname: string;
  identifier?: string;
}
