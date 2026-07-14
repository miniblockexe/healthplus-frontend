import {
  Component,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormsModule,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { MedicalVisit } from '../../core/models/medical-visit.model';
import { Hospital } from '../../core/models/hospital.model';
import { ApiResponse } from '../../core/models/api-response.model';
import { OfflineService } from '../../core/services/offline.service';

@Component({
  selector: 'app-medical-history',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './medical-history.component.html',
})
export class MedicalHistoryComponent implements OnInit {
  private apiUrl = environment.apiUrl;

  // ─── State ───────────────────────────────────────────────────
  visits = signal<MedicalVisit[]>([]);
  hospitals = signal<Hospital[]>([]);
  isLoading = signal(false);
  isSubmitting = signal(false);
  showForm = signal(false);
  successMessage = signal('');
  errorMessage = signal('');
  offlineMessage = signal('');
  uploadingVisitId = signal<number | null>(null);

  // ─── Pagination ──────────────────────────────────────────────
  currentPage = signal(1);
  totalPages = signal(1);
  totalItems = signal(0);
  readonly pageSize = 10;

  // Pages array de render so trang (max 5 so)
  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const maxPages = 5;

    if (total <= maxPages)
      return Array.from({ length: total }, (_, i) => i + 1);

    let start = Math.max(1, current - 2);
    const end = Math.min(total, start + maxPages - 1);
    if (end - start < maxPages - 1) start = Math.max(1, end - maxPages + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  // ─── Search & Filter ─────────────────────────────────────────
  searchText = '';
  filterFrom = '';
  filterTo = '';

  private searchSubject = new Subject<string>();

  form = this.fb.group({
    hospitalId: ['', Validators.required],
    visitDate: ['', Validators.required],
    note: [''],
  });

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    public offlineService: OfflineService,
  ) {
    // Debounce 400ms: chi goi API sau khi user ngung go 400ms
    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadVisits();
      });
  }

  ngOnInit() {
    this.loadHospitals();
    this.loadVisits();
  }

  loadHospitals() {
    if (this.offlineService.isOnline()) {
      this.http
        .get<ApiResponse<Hospital[]>>(`${this.apiUrl}/hospitals`)
        .subscribe({ next: (res) => this.hospitals.set(res.data) });
    }
  }

  // Duoc goi khi user go vao o tim kiem (ngModel + event)
  onSearchChange() {
    this.searchSubject.next(this.searchText);
  }

  // Duoc goi khi user chon ngay loc
  onFilterChange() {
    this.currentPage.set(1);
    this.loadVisits();
  }

  clearFilters() {
    this.searchText = '';
    this.filterFrom = '';
    this.filterTo = '';
    this.currentPage.set(1);
    this.loadVisits();
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages() || page === this.currentPage())
      return;
    this.currentPage.set(page);
    this.loadVisits();
  }

  loadVisits() {
    this.isLoading.set(true);
    this.offlineMessage.set('');

    if (!this.offlineService.isOnline()) {
      this.offlineService.getMedicalVisits().then((data) => {
        // Loc offline theo tu khoa (don gian, khong phan trang)
        const keyword = this.searchText.toLowerCase();
        const filtered = keyword
          ? data.filter(
              (v: any) =>
                v.hospitalName?.toLowerCase().includes(keyword) ||
                v.doctorName?.toLowerCase().includes(keyword) ||
                v.diagnosis?.toLowerCase().includes(keyword),
            )
          : data;
        this.visits.set(filtered);
        this.totalItems.set(filtered.length);
        this.totalPages.set(1);
        this.offlineMessage.set(
          filtered.length > 0
            ? 'Du lieu tu cache offline'
            : 'Khong co du lieu cache.',
        );
        this.isLoading.set(false);
      });
      return;
    }

    const params: Record<string, string> = {
      page: String(this.currentPage()),
      limit: String(this.pageSize),
    };
    if (this.searchText.trim()) params['search'] = this.searchText.trim();
    if (this.filterFrom) params['from'] = this.filterFrom;
    if (this.filterTo) params['to'] = this.filterTo;

    const query = new URLSearchParams(params).toString();

    this.http.get<any>(`${this.apiUrl}/medical-visits?${query}`).subscribe({
      next: async (res) => {
        this.visits.set(res.data);
        this.totalItems.set(res.total);
        this.totalPages.set(res.totalPages);
        this.isLoading.set(false);
        try {
          await this.offlineService.saveMedicalVisits(res.data);
        } catch {}
      },
      error: async () => {
        const data = await this.offlineService.getMedicalVisits();
        this.visits.set(data);
        this.totalItems.set(data.length);
        this.totalPages.set(1);
        this.offlineMessage.set('Hien thi du lieu da cache.');
        this.isLoading.set(false);
      },
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const val = this.form.value;
    const selectedHospital = this.hospitals().find(
      (h) => h.id === +val.hospitalId!,
    );

    const body: any = {
      hospitalName: selectedHospital?.name || '',
      visitDate: val.visitDate,
    };
    if (val.note) body.note = val.note;

    if (!this.offlineService.isOnline()) {
      this.offlineService
        .addToSyncQueue({
          entityType: 'medical_visit',
          action: 'CREATE',
          payload: body,
          status: 'pending',
          createdAt: new Date().toISOString(),
        })
        .then(() => {
          const tempItem = {
            ...body,
            id: -Date.now(),
            attachments: [],
            createdAt: new Date().toISOString(),
          } as any;
          this.visits.update((list) => [tempItem, ...list]);
          this.form.reset();
          this.showForm.set(false);
          this.successMessage.set('Da luu offline! Se dong bo khi co mang.');
          this.isSubmitting.set(false);
          setTimeout(() => this.successMessage.set(''), 4000);
        });
      return;
    }

    this.http
      .post<ApiResponse<MedicalVisit>>(`${this.apiUrl}/medical-visits`, body)
      .subscribe({
        next: async (res) => {
          this.form.reset();
          this.showForm.set(false);
          this.successMessage.set('Them lan kham thanh cong!');
          this.isSubmitting.set(false);
          setTimeout(() => this.successMessage.set(''), 3000);
          this.loadVisits(); // reload de cap nhat pagination va total
        },
        error: (err) => {
          this.errorMessage.set(err.error?.message || 'Co loi xay ra!');
          this.isSubmitting.set(false);
        },
      });
  }

  deleteVisit(id: number) {
    if (id < 0) {
      this.errorMessage.set('Khong the xoa ban ghi chua dong bo.');
      return;
    }
    if (!confirm('Xoa lan kham nay?')) return;
    this.http
      .delete<ApiResponse<any>>(`${this.apiUrl}/medical-visits/${id}`)
      .subscribe({
        next: async () => {
          this.loadVisits();
        },
      });
  }

  async uploadFile(visitId: number, file: File) {
    if (visitId < 0) {
      this.errorMessage.set('Chua the upload khi ban ghi chua dong bo.');
      return;
    }
    this.errorMessage.set('');
    this.uploadingVisitId.set(visitId);

    let fileToUpload: File | Blob = file;
    if (file.type.startsWith('image/')) {
      try {
        const compressed = await this.compressImage(file);
        fileToUpload = new File(
          [compressed],
          file.name.replace(/\.[^/.]+$/, '.jpg'),
          { type: 'image/jpeg' },
        );
      } catch (err: any) {
        this.errorMessage.set(err?.message || 'Khong the xu ly file anh');
        this.uploadingVisitId.set(null);
        return;
      }
    }

    const formData = new FormData();
    formData.append('file', fileToUpload);

    this.http
      .post<any>(
        `${this.apiUrl}/medical-visits/${visitId}/attachments`,
        formData,
      )
      .subscribe({
        next: (res) => {
          this.uploadingVisitId.set(null);
          this.visits.update((list) =>
            list.map((v) =>
              v.id === visitId
                ? { ...v, attachments: [...(v.attachments || []), res.data] }
                : v,
            ),
          );
          this.successMessage.set('Upload file thanh cong!');
          setTimeout(() => this.successMessage.set(''), 3000);
        },
        error: () => {
          this.uploadingVisitId.set(null);
          this.errorMessage.set('Upload that bai!');
          setTimeout(() => this.errorMessage.set(''), 3000);
        },
      });
  }

  onFileSelected(event: any, visitId: number) {
    const file = event.target.files[0];
    if (file) this.uploadFile(visitId, file);
  }

  async compressImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onerror = () =>
        reject(new Error('Khong the doc file: ' + file.name));
      reader.onload = (e: any) => {
        const img = new Image();
        img.src = e.target.result;
        img.onerror = () => reject(new Error('Anh bi loi: ' + file.name));
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 1200;
          let width = img.width,
            height = img.height;
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('canvas.toBlob that bai'));
            },
            'image/jpeg',
            0.8,
          );
        };
      };
    });
  }
}
