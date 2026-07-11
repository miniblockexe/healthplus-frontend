import { Routes } from '@angular/router';

export const doctorRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./doctor.component').then((m) => m.DoctorComponent),
  },
  {
    path: 'patient/:id',
    loadComponent: () =>
      import('./patient-detail/patient-detail.component').then(
        (m) => m.PatientDetailComponent
      ),
  },
];