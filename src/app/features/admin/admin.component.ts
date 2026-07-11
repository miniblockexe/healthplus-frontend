import { Component, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/api-response.model';
import { User } from '../../core/models/user.model';
import { VaccineCatalog } from '../../core/models/vaccine.model';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-admin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin.component.html',
})
export class AdminComponent implements OnInit {
  private apiUrl = environment.apiUrl;

  activeTab = signal<'users' | 'vaccines'>('users');
  users = signal<User[]>([]);
  vaccines = signal<VaccineCatalog[]>([]);
  isLoading = signal(false);
  showVaccineForm = signal(false);
  editingVaccine = signal<VaccineCatalog | null>(null);
  successMessage = signal('');
  errorMessage = signal('');

  vaccineForm = this.fb.group({
    vaccineName: ['', Validators.required],
    diseasePrevented: [''],
    totalDoses: [1, Validators.required],
    targetGroup: ['all'],
    manufacturer: [''],
  });

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
  ) {}

  ngOnInit() {
    this.loadUsers();
    this.loadVaccines();
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
      .patch<ApiResponse<User>>(`${this.apiUrl}/users/${userId}/toggle-status`, {})
      .subscribe({
        next: (res) => {
          this.users.update(list =>
            list.map(u => u.id === userId ? res.data : u)
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
          this.users.update(list =>
            list.map(u => u.id === userId ? res.data : u)
          );
          this.showSuccess('Đổi role thành công!');
        },
      });
  }

  // ─── VACCINES ──────────────────────────────────────────

  loadVaccines() {
    this.http.get<ApiResponse<VaccineCatalog[]>>(`${this.apiUrl}/vaccines/catalog`).subscribe({
      next: (res) => this.vaccines.set(res.data),
    });
  }

  openAddForm() {
    this.editingVaccine.set(null);
    this.vaccineForm.reset({ totalDoses: 1, targetGroup: 'all' });
    this.showVaccineForm.set(true);
  }

  openEditForm(vaccine: VaccineCatalog) {
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
      // Sửa vaccine
      this.http
        .patch<ApiResponse<VaccineCatalog>>(`${this.apiUrl}/vaccines/catalog/${editing.id}`, body)
        .subscribe({
          next: (res) => {
            this.vaccines.update(list =>
              list.map(v => v.id === editing.id ? res.data : v)
            );
            this.showVaccineForm.set(false);
            this.showSuccess('Cập nhật vaccine thành công!');
          },
        });
    } else {
      // Thêm vaccine mới
      this.http
        .post<ApiResponse<VaccineCatalog>>(`${this.apiUrl}/vaccines/catalog`, body)
        .subscribe({
          next: (res) => {
            this.vaccines.update(list => [...list, res.data]);
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
          this.vaccines.update(list => list.filter(v => v.id !== id));
          this.showSuccess('Xóa vaccine thành công!');
        },
      });
  }

  closeForm() {
    this.showVaccineForm.set(false);
    this.editingVaccine.set(null);
    this.vaccineForm.reset({ totalDoses: 1, targetGroup: 'all' });
  }

  private showSuccess(msg: string) {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(''), 3000);
  }
}