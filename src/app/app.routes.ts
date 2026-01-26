import { Routes } from '@angular/router';
import { adminGuard, parentGuard, loginGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'children',
        loadComponent: () => import('./features/children/children.component').then(m => m.ChildrenComponent)
      },
      {
        path: 'cancellation',
        loadComponent: () => import('./features/cancellation/cancellation.component').then(m => m.CancellationComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
      }
    ]
  },
  {
    path: 'parent',
    canActivate: [parentGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/parent/parent-dashboard.component').then(m => m.ParentDashboardComponent)
      },
      {
        path: 'cancel',
        loadComponent: () => import('./features/parent/parent-cancellation.component').then(m => m.ParentCancellationComponent)
      },
      {
        path: 'summary',
        loadComponent: () => import('./features/parent/parent-summary.component').then(m => m.ParentSummaryComponent)
      }
    ]
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
