import {
  Component,
  signal,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { UserVaccine, VaccineCatalog } from '../../core/models/vaccine.model';
import { ApiResponse } from '../../core/models/api-response.model';
import { VaccineStatusPipe } from '../../shared/pipes/vaccine-status.pipe';
import { OfflineService } from '../../core/services/offline.service';

@Component({
  selector: 'app-vaccine',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, VaccineStatusPipe],
  templateUrl: './vaccine.component.html',
})
export class VaccineComponent implements OnInit {
  private apiUrl = environment.apiUrl;

  vaccines = signal<UserVaccine[]>([]);
  catalog = signal<VaccineCatalog[]>([]);
  hospitals = signal<{ id: number; name: string }[]>([]);
  isLoading = signal(false);
  isSubmitting = signal(false);
  showForm = signal(false);
  successMessage = signal('');
  offlineMessage = signal('');

  form = this.fb.group({
    vaccineId: ['', Validators.required],
    doseNumber: [1, Validators.required],
    vaccinatedDate: [''],
    nextDueDate: [''],
    location: [''],
    batchNumber: [''],
    note: [''],
  });

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    public offlineService: OfflineService,
  ) {}

  ngOnInit() {
    this.loadCatalog();
    this.loadSchedule();
    this.loadHospitals();
  }

  loadHospitals() {
    this.http
      .get<any>(`${this.apiUrl}/hospitals`)
      .subscribe({ next: (res) => this.hospitals.set(res.data ?? res) });
  }

  loadCatalog() {
    if (this.offlineService.isOnline()) {
      this.http
        .get<ApiResponse<VaccineCatalog[]>>(`${this.apiUrl}/vaccines/catalog`)
        .subscribe({ next: (res) => this.catalog.set(res.data) });
    }
  }

  loadSchedule() {
    this.isLoading.set(true);
    this.offlineMessage.set('');

    // Offline: doc tu IndexedDB cache
    if (!this.offlineService.isOnline()) {
      this.offlineService.getVaccines().then((data) => {
        this.vaccines.set(data);
        this.offlineMessage.set(
          data.length > 0
            ? 'Du lieu hien thi tu cache offline'
            : 'Khong co du lieu cache. Vui long ket noi mang de tai.',
        );
        this.isLoading.set(false);
      });
      return;
    }

    // Online: fetch API va luu cache vao IndexedDB
    this.http
      .get<ApiResponse<UserVaccine[]>>(`${this.apiUrl}/vaccines/my-schedule`)
      .subscribe({
        next: async (res) => {
          this.vaccines.set(res.data);
          this.isLoading.set(false);
          try {
            await this.offlineService.saveVaccines(res.data);
          } catch {}
        },
        error: async () => {
          // Network error -> fallback sang IndexedDB
          const data = await this.offlineService.getVaccines();
          this.vaccines.set(data);
          this.offlineMessage.set(
            'Khong the ket noi server, hien thi du lieu da cache.',
          );
          this.isLoading.set(false);
        },
      });
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.isSubmitting.set(true);

    const val = this.form.value;
    const body: any = {
      vaccineId: +val.vaccineId!,
      doseNumber: +val.doseNumber!,
    };
    if (val.vaccinatedDate) body.vaccinatedDate = val.vaccinatedDate;
    if (val.nextDueDate) body.nextDueDate = val.nextDueDate;
    if (val.location) body.location = val.location;
    if (val.batchNumber) body.batchNumber = val.batchNumber;
    if (val.note) body.note = val.note;

    // Offline: them vao sync queue va cap nhat UI lac quan
    if (!this.offlineService.isOnline()) {
      this.offlineService
        .addToSyncQueue({
          entityType: 'vaccine',
          action: 'CREATE',
          payload: body,
          status: 'pending',
          createdAt: new Date().toISOString(),
        })
        .then(() => {
          const tempItem = {
            ...body,
            id: -Date.now(),
            status: 'pending',
            vaccine: this.catalog().find((c) => c.id === body.vaccineId),
          } as any;
          this.vaccines.update((list) => [...list, tempItem]);
          this.form.reset({ doseNumber: 1 });
          this.showForm.set(false);
          this.successMessage.set('Da luu offline! Se dong bo khi co mang.');
          this.isSubmitting.set(false);
          setTimeout(() => this.successMessage.set(''), 4000);
        });
      return;
    }

    this.http
      .post<
        ApiResponse<UserVaccine>
      >(`${this.apiUrl}/vaccines/my-schedule`, body)
      .subscribe({
        next: async (res) => {
          this.vaccines.update((list) => [...list, res.data]);
          try {
            await this.offlineService.saveVaccines(this.vaccines());
          } catch {}
          this.form.reset({ doseNumber: 1 });
          this.showForm.set(false);
          this.successMessage.set('Them vaccine thanh cong!');
          this.isSubmitting.set(false);
          setTimeout(() => this.successMessage.set(''), 3000);
        },
        error: () => this.isSubmitting.set(false),
      });
  }

  get doneCount() {
    return this.vaccines().filter((v) => v.status === 'done').length;
  }
  get pendingCount() {
    return this.vaccines().filter((v) => v.status === 'pending').length;
  }
  get overdueCount() {
    return this.vaccines().filter((v) => v.status === 'overdue').length;
  }
}
