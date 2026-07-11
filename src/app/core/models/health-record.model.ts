export interface HealthProfile {
  id: number;
  userId: number;
  bloodGroup?: string;
  allergies?: string;
  chronicDiseases?: string;
  heightCm?: number;
  weightKg?: number;
  emergencyContact?: string;
  insuranceNumber?: string;
  updatedAt: string;
}

export interface VitalSign {
  id: number;
  userId: number;
  systolicBp?: number;
  diastolicBp?: number;
  heartRate?: number;
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
  temperature?: number;
  bloodSugar?: number;
  note?: string;
  recordedAt: string;
}
