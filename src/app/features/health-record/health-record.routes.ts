import { Routes } from '@angular/router';

export const healthRecordRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./health-record.component').then((m) => m.HealthRecordComponent),
  },
];