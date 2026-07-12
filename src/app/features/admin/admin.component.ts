import {
  Component,
  signal,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/api-response.model';
import { User } from '../../core/models/user.model';
import { VaccineCatalog } from '../../core/models/vaccine.model';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

interface Hospital {
  id: number;
  name: string;
  address?: string;
  specialty?: string;
  isActive: boolean;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin.component.html',
})
export class AdminComponent implements OnInit {
  private apiUrl = environment.apiUrl;

  activeTab = signal<'users' | 'vaccines' | 'hospitals'>('users');

  // Users
  users = signal<User[]>([]);
  isLoading = signal(false);

  // Vaccines
  vaccines = signal<VaccineCatalog[]>([]);
  showVaccineForm = signal(false);
  editingVaccine = signal<VaccineCatalog | null>(null);

  // Hospitals
  hospitals = signal<Hospital[]>([]);
  showHospitalForm = signal(false);
  editingHospital = signal<Hospital | null>(null);

  // Messages
  successMessage = signal('');
  errorMessage = signal('');

  vaccineForm = this.fb.group({
    vaccineName: ['', Validators.required],
    diseasePrevented: [''],
    totalDoses: [1, Validators.required],
    targetGroup: ['all'],
    manufacturer: [''],
  });

  hospitalForm = this.fb.group({
    name: ['', Validators.required],
    address: [''],
    specialty: [''],
  });

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
  ) {}

  ngOnInit() {
    this.loadUsers();
    this.loadVaccines();
    this.loadHospitals();
  }

  // ─── USERS ─────────────────────────────────────────────

  loadUsers() {
    this.isLoading.set(true);
    this.http.get<ApiResponse<User[]>>(`${this.apiUrl}/users/all`).subscribe({
      next: (res) => {
        this.users.set(res.data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  toggleUserStatus(userId: number) {
    this.http
      .patch<
        ApiResponse<User>
      >(`${this.apiUrl}/users/${userId}/toggle-status`, {})
      .subscribe({
        next: (res) => {
          this.users.update((list) =>
            list.map((u) => (u.id === userId ? res.data : u)),
          );
          this.showSuccess('Cập nhật trạng thái thành công!');
        },
      });
  }

  changeRole(userId: number, role: string) {
    this.http
      .patch<ApiResponse<User>>(`${this.apiUrl}/users/${userId}/role`, { role })
      .subscribe({
        next: (res) => {
          this.users.update((list) =>
            list.map((u) => (u.id === userId ? res.data : u)),
          );
          this.showSuccess('Đổi role thành công!');
        },
      });
  }

  // ─── VACCINES ──────────────────────────────────────────

  loadVaccines() {
    this.http
      .get<ApiResponse<VaccineCatalog[]>>(`${this.apiUrl}/vaccines/catalog`)
      .subscribe({
        next: (res) => this.vaccines.set(res.data),
      });
  }

  openAddVaccineForm() {
    this.editingVaccine.set(null);
    this.vaccineForm.reset({ totalDoses: 1, targetGroup: 'all' });
    this.showVaccineForm.set(true);
  }

  openEditVaccineForm(vaccine: VaccineCatalog) {
    this.editingVaccine.set(vaccine);
    this.vaccineForm.patchValue({
      vaccineName: vaccine.vaccineName,
      diseasePrevented: vaccine.diseasePrevented || '',
      totalDoses: vaccine.totalDoses,
      targetGroup: vaccine.targetGroup || 'all',
      manufacturer: vaccine.manufacturer || '',
    });
    this.showVaccineForm.set(true);
  }

  saveVaccine() {
    if (this.vaccineForm.invalid) return;
    const body = this.vaccineForm.value;
    const editing = this.editingVaccine();

    if (editing) {
      this.http
        .patch<
          ApiResponse<VaccineCatalog>
        >(`${this.apiUrl}/vaccines/catalog/${editing.id}`, body)
        .subscribe({
          next: (res) => {
            this.vaccines.update((list) =>
              list.map((v) => (v.id === editing.id ? res.data : v)),
            );
            this.showVaccineForm.set(false);
            this.showSuccess('Cập nhật vaccine thành công!');
          },
        });
    } else {
      this.http
        .post<
          ApiResponse<VaccineCatalog>
        >(`${this.apiUrl}/vaccines/catalog`, body)
        .subscribe({
          next: (res) => {
            this.vaccines.update((list) => [...list, res.data]);
            this.showVaccineForm.set(false);
            this.showSuccess('Thêm vaccine thành công!');
          },
        });
    }
  }

  deleteVaccine(id: number) {
    if (!confirm('Xóa vaccine này?')) return;
    this.http
      .delete<ApiResponse<any>>(`${this.apiUrl}/vaccines/catalog/${id}`)
      .subscribe({
        next: () => {
          this.vaccines.update((list) => list.filter((v) => v.id !== id));
          this.showSuccess('Xóa vaccine thành công!');
        },
      });
  }

  closeVaccineForm() {
    this.showVaccineForm.set(false);
    this.editingVaccine.set(null);
    this.vaccineForm.reset({ totalDoses: 1, targetGroup: 'all' });
  }

  // ─── HOSPITALS ─────────────────────────────────────────

  loadHospitals() {
    this.http
      .get<ApiResponse<Hospital[]>>(`${this.apiUrl}/hospitals`)
      .subscribe({
        next: (res) => this.hospitals.set(res.data),
      });
  }

  openAddHospitalForm() {
    this.editingHospital.set(null);
    this.hospitalForm.reset();
    this.showHospitalForm.set(true);
  }

  openEditHospitalForm(hospital: Hospital) {
    this.editingHospital.set(hospital);
    this.hospitalForm.patchValue({
      name: hospital.name,
      address: hospital.address || '',
      specialty: hospital.specialty || '',
    });
    this.showHospitalForm.set(true);
  }

  saveHospital() {
    if (this.hospitalForm.invalid) return;
    const body = this.hospitalForm.value;
    const editing = this.editingHospital();

    if (editing) {
      this.http
        .patch<
          ApiResponse<Hospital>
        >(`${this.apiUrl}/hospitals/${editing.id}`, body)
        .subscribe({
          next: (res) => {
            this.hospitals.update((list) =>
              list.map((h) => (h.id === editing.id ? res.data : h)),
            );
            this.showHospitalForm.set(false);
            this.showSuccess('Cập nhật bệnh viện thành công!');
          },
        });
    } else {
      this.http
        .post<ApiResponse<Hospital>>(`${this.apiUrl}/hospitals`, body)
        .subscribe({
          next: (res) => {
            this.hospitals.update((list) => [...list, res.data]);
            this.showHospitalForm.set(false);
            this.showSuccess('Thêm bệnh viện thành công!');
          },
        });
    }
  }

  deleteHospital(id: number) {
    if (!confirm('Xóa bệnh viện này?')) return;
    this.http
      .delete<ApiResponse<any>>(`${this.apiUrl}/hospitals/${id}`)
      .subscribe({
        next: () => {
          this.hospitals.update((list) => list.filter((h) => h.id !== id));
          this.showSuccess('Xóa bệnh viện thành công!');
        },
      });
  }

  closeHospitalForm() {
    this.showHospitalForm.set(false);
    this.editingHospital.set(null);
    this.hospitalForm.reset();
  }

  // ─── UTILS ─────────────────────────────────────────────

  private showSuccess(msg: string) {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(''), 3000);
  }
}
