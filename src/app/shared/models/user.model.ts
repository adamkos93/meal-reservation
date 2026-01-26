export type UserRole = 'admin' | 'parent';

export interface User {
  role: UserRole;
  childId?: string;
  childNickname?: string;
}
