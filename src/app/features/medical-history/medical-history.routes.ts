import { Routes } from '@angular/router';

export const medicalHistoryRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./medical-history.component').then(
        (m) => m.MedicalHistoryComponent,
      ),
  },
];
