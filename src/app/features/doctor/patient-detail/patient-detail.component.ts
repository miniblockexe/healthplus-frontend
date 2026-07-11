import { Component, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { User } from '../../../core/models/user.model';
import { VitalSign } from '../../../core/models/health-record.model';
import { MedicalVisit } from '../../../core/models/medical-visit.model';
import { UserVaccine } from '../../../core/models/vaccine.model';
import { VaccineStatusPipe } from '../../../shared/pipes/vaccine-status.pipe';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, VaccineStatusPipe, ReactiveFormsModule],
  templateUrl: './patient-detail.component.html',
})
export class PatientDetailComponent implements OnInit {
  private apiUrl = environment.apiUrl;

  patient = signal<User | null>(null);
  vitalSigns = signal<VitalSign[]>([]);
  medicalVisits = signal<MedicalVisit[]>([]);
  vaccines = signal<UserVaccine[]>([]);
  isLoading = signal(false);
  isSubmitting = signal(false);
  activeTab = signal<'vitals' | 'visits' | 'vaccines' | 'diagnosis'>('vitals');
  successMessage = signal('');
  patientId: number = 0;

  diagnosisForm = this.fb.group({
    hospitalName: ['', Validators.required],
    diagnosis: ['', Validators.required],
    treatment: [''],
    specialty: [''],
    visitDate: [new Date().toISOString().split('T')[0], Validators.required],
    followUpDate: [''],
  });

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private fb: FormBuilder,
  ) {}

  ngOnInit() {
    this.patientId = +this.route.snapshot.params['id'];
    this.loadPatientData();
  }

loadPatientData() {
  this.isLoading.set(true);

  this.http
    .get<ApiResponse<User>>(`${this.apiUrl}/users/patients/${this.patientId}`)
    .subscribe({
      next: (res) => {
        this.patient.set(res.data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });

  this.http
    .get<ApiResponse<VitalSign[]>>(
      `${this.apiUrl}/health-records/vital-signs/patient/${this.patientId}`
    )
    .subscribe({ next: (res) => this.vitalSigns.set(res.data) });

  this.http
    .get<ApiResponse<MedicalVisit[]>>(
      `${this.apiUrl}/medical-visits/patient/${this.patientId}`
    )
    .subscribe({
      next: (res) => this.medicalVisits.set((res as any).data ?? res)
    });

  this.http
    .get<ApiResponse<UserVaccine[]>>(
      `${this.apiUrl}/vaccines/patient/${this.patientId}`
    )
    .subscribe({ next: (res) => this.vaccines.set(res.data) });
}

  submitDiagnosis() {
    if (this.diagnosisForm.invalid) return;
    this.isSubmitting.set(true);

    const val = this.diagnosisForm.value;
    const body: any = {
      hospitalName: val.hospitalName,
      diagnosis: val.diagnosis,
      visitDate: val.visitDate,
    };
    if (val.treatment) body.treatment = val.treatment;
    if (val.specialty) body.specialty = val.specialty;
    if (val.followUpDate) body.followUpDate = val.followUpDate;

    this.http
      .post<ApiResponse<MedicalVisit>>(
        `${this.apiUrl}/medical-visits/patient/${this.patientId}`,
        body,
      )
      .subscribe({
        next: (res) => {
          this.medicalVisits.update(list => [res.data, ...list]);
          this.diagnosisForm.patchValue({
            diagnosis: '',
            treatment: '',
            followUpDate: '',
          });
          this.successMessage.set('✅ Thêm chẩn đoán thành công!');
          this.isSubmitting.set(false);
          this.activeTab.set('visits');
          setTimeout(() => this.successMessage.set(''), 3000);
        },
        error: () => this.isSubmitting.set(false),
      });
  }

  getBmiStatus(bmi: number): { label: string; color: string } {
    if (bmi < 18.5) return { label: 'Thiếu cân', color: 'text-blue-500' };
    if (bmi < 25) return { label: 'Bình thường', color: 'text-green-500' };
    if (bmi < 30) return { label: 'Thừa cân', color: 'text-yellow-500' };
    return { label: 'Béo phì', color: 'text-red-500' };
  }
}