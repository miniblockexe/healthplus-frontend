import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { guestGuard } from './core/auth/guest.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // Auth routes
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },

  // Protected routes với Sidebar Layout
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/components/layout/layout.component').then(
        (m) => m.LayoutComponent,
      ),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'health-record',
        loadChildren: () =>
          import('./features/health-record/health-record.routes').then(
            (m) => m.healthRecordRoutes,
          ),
      },
      {
        path: 'medical-history',
        loadChildren: () =>
          import('./features/medical-history/medical-history.routes').then(
            (m) => m.medicalHistoryRoutes,
          ),
      },
      {
        path: 'vaccine',
        loadChildren: () =>
          import('./features/vaccine/vaccine.routes').then(
            (m) => m.vaccineRoutes,
          ),
      },
      {
        path: 'ai-health',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/ai-health/ai-health.component').then(
            (m) => m.AiHealthComponent,
          ),
      },
      {
        path: 'admin',
        canActivate: [roleGuard(['admin'])],
        loadChildren: () =>
          import('./features/admin/admin.routes').then((m) => m.adminRoutes),
      },
      {
        path: 'doctor',
        canActivate: [roleGuard(['doctor', 'admin'])],
        loadChildren: () =>
          import('./features/doctor/doctor.routes').then((m) => m.doctorRoutes),
      },
      {
        path: 'profile',
        loadChildren: () =>
          import('./features/profile/profile.routes').then(
            (m) => m.profileRoutes,
          ),
      },
    ],
  },

  { path: '**', redirectTo: 'dashboard' },
];
