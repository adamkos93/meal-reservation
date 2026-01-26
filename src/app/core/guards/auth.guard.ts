import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.initialize();

  if (auth.isLoggedIn()) {
    return true;
  }
  return router.parseUrl('/login');
};

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.initialize();

  if (auth.isAdmin()) {
    return true;
  }
  if (auth.isParent()) {
    return router.parseUrl('/parent');
  }
  return router.parseUrl('/login');
};

export const parentGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.initialize();

  if (auth.isParent()) {
    return true;
  }
  if (auth.isAdmin()) {
    return router.parseUrl('/admin');
  }
  return router.parseUrl('/login');
};

export const loginGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.initialize();

  if (auth.isAdmin()) {
    return router.parseUrl('/admin');
  }
  if (auth.isParent()) {
    return router.parseUrl('/parent');
  }
  return true;
};
