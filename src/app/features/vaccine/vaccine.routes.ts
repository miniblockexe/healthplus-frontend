import { Routes } from '@angular/router';

export const vaccineRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./vaccine.component').then((m) => m.VaccineComponent),
  },
];