export interface VaccineCatalog {
  id: number;
  vaccineName: string;
  diseasePrevented?: string;
  totalDoses: number;
  scheduleJson?: any;
  targetGroup?: string;
  manufacturer?: string;
}

export type VaccineStatus = 'pending' | 'done' | 'overdue';

export interface UserVaccine {
  id: number;
  userId: number;
  vaccineId: number;
  vaccine: VaccineCatalog; 
  doseNumber: number;
  vaccinatedDate?: string;
  nextDueDate?: string;
  status: VaccineStatus;
  batchNumber?: string;
  location?: string;
  note?: string;
  createdAt: string;
}
