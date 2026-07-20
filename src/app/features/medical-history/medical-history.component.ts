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
import { NotificationService } from '../../core/services/notification.service';

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
  hospitalOpen = signal(false);
  hospitalLabel = signal('-- Chọn bệnh viện --');

  selectHospital(id: string, name: string) {
    this.form.get('hospitalId')?.setValue(id);
    this.hospitalLabel.set(name);
    this.hospitalOpen.set(false);
  }

  visits = signal<MedicalVisit[]>([]);
  hospitals = signal<Hospital[]>([]);
  isLoading = signal(false);
  isSubmitting = signal(false);
  showForm = signal(false);
  successMessage = signal('');
  errorMessage = signal('');
  offlineMessage = signal('');

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

  // Custom date picker cho filter
  filterFromOpen = signal(false);
  filterToOpen = signal(false);

  toggleFilterPicker(which: 'from' | 'to') {
    if (which === 'from') {
      this.filterFromOpen.set(!this.filterFromOpen());
      this.filterToOpen.set(false);
    } else {
      this.filterToOpen.set(!this.filterToOpen());
      this.filterFromOpen.set(false);
    }
  }
  filterFromDisplay = signal('');
  filterToDisplay = signal('');
  filterFromCal = signal({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  });
  filterToCal = signal({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  });
  filterFromView = signal<'day' | 'month' | 'year'>('day');
  filterToView = signal<'day' | 'month' | 'year'>('day');
  filterFromYearStart = signal(new Date().getFullYear() - 5);
  filterToYearStart = signal(new Date().getFullYear() - 5);

  readonly CAL_MONTHS = [
    'Tháng 1',
    'Tháng 2',
    'Tháng 3',
    'Tháng 4',
    'Tháng 5',
    'Tháng 6',
    'Tháng 7',
    'Tháng 8',
    'Tháng 9',
    'Tháng 10',
    'Tháng 11',
    'Tháng 12',
  ];
  readonly CAL_MONTHS_S = [
    'Th1',
    'Th2',
    'Th3',
    'Th4',
    'Th5',
    'Th6',
    'Th7',
    'Th8',
    'Th9',
    'Th10',
    'Th11',
    'Th12',
  ];
  readonly CAL_DAYS_HDR = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  getFilterCalDays(year: number, month: number): (number | null)[] {
    const first = new Date(year, month, 1).getDay();
    const total = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = Array(first).fill(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  toFilterDateStr(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  toFilterDisplay(s: string): string {
    if (!s) return '';
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  }

  selectFilterDate(which: 'from' | 'to', day: number) {
    const cal = which === 'from' ? this.filterFromCal() : this.filterToCal();
    const val = this.toFilterDateStr(cal.year, cal.month, day);
    if (which === 'from') {
      this.filterFrom = val;
      this.filterFromDisplay.set(this.toFilterDisplay(val));
      this.filterFromOpen.set(false);
      this.filterFromView.set('day');
    } else {
      this.filterTo = val;
      this.filterToDisplay.set(this.toFilterDisplay(val));
      this.filterToOpen.set(false);
      this.filterToView.set('day');
    }
    this.onFilterChange();
  }

  toggleFilterView(which: 'from' | 'to') {
    if (which === 'from')
      this.filterFromView.set(this.filterFromView() === 'day' ? 'year' : 'day');
    else this.filterToView.set(this.filterToView() === 'day' ? 'year' : 'day');
  }

  filterPrevMonth(which: 'from' | 'to') {
    if (which === 'from') {
      const { year, month } = this.filterFromCal();
      const d = new Date(year, month - 1, 1);
      this.filterFromCal.set({ year: d.getFullYear(), month: d.getMonth() });
    } else {
      const { year, month } = this.filterToCal();
      const d = new Date(year, month - 1, 1);
      this.filterToCal.set({ year: d.getFullYear(), month: d.getMonth() });
    }
  }

  filterNextMonth(which: 'from' | 'to') {
    if (which === 'from') {
      const { year, month } = this.filterFromCal();
      const d = new Date(year, month + 1, 1);
      this.filterFromCal.set({ year: d.getFullYear(), month: d.getMonth() });
    } else {
      const { year, month } = this.filterToCal();
      const d = new Date(year, month + 1, 1);
      this.filterToCal.set({ year: d.getFullYear(), month: d.getMonth() });
    }
  }

  selectFilterMonth(which: 'from' | 'to', monthIdx: number) {
    if (which === 'from') {
      this.filterFromCal.update((c) => ({ ...c, month: monthIdx }));
      this.filterFromView.set('day');
    } else {
      this.filterToCal.update((c) => ({ ...c, month: monthIdx }));
      this.filterToView.set('day');
    }
  }

  selectFilterYear(which: 'from' | 'to', year: number) {
    if (which === 'from') {
      this.filterFromCal.update((c) => ({ ...c, year }));
      this.filterFromView.set('month');
    } else {
      this.filterToCal.update((c) => ({ ...c, year }));
      this.filterToView.set('month');
    }
  }

  shiftFilterYears(which: 'from' | 'to', dir: number) {
    if (which === 'from') this.filterFromYearStart.update((y) => y + dir * 12);
    else this.filterToYearStart.update((y) => y + dir * 12);
  }

  getFilterYearRange(start: number): number[] {
    return Array.from({ length: 12 }, (_, i) => start + i);
  }

  isFilterFromToday(year: number, month: number, day: number): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (
      this.toFilterDateStr(year, month, day) ===
      today.toISOString().split('T')[0]
    );
  }

  clearFilterDate(which: 'from' | 'to') {
    if (which === 'from') {
      this.filterFrom = '';
      this.filterFromDisplay.set('');
      this.filterFromOpen.set(false);
    } else {
      this.filterTo = '';
      this.filterToDisplay.set('');
      this.filterToOpen.set(false);
    }
    this.onFilterChange();
  }

  // Visit Date Picker signals
  visitDatePicker = signal(false);
  visitDateDisplay = signal('');
  visitDateCal = signal({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  });
  visitDateView = signal<'day' | 'month' | 'year'>('day');
  visitDateYearStart = signal(new Date().getFullYear() - 5);
  readonly today = new Date().toISOString().split('T')[0];

  toggleVisitDateView() {
    this.visitDateView.set(this.visitDateView() === 'day' ? 'year' : 'day');
  }

  visitDatePrevMonth() {
    const { year, month } = this.visitDateCal();
    this.visitDateCal.set({
      year: new Date(year, month - 1, 1).getFullYear(),
      month: new Date(year, month - 1, 1).getMonth(),
    });
  }

  visitDateNextMonth() {
    const { year, month } = this.visitDateCal();
    this.visitDateCal.set({
      year: new Date(year, month + 1, 1).getFullYear(),
      month: new Date(year, month + 1, 1).getMonth(),
    });
  }

  selectVisitDateMonth(monthIdx: number) {
    this.visitDateCal.update((c) => ({ ...c, month: monthIdx }));
    this.visitDateView.set('day');
  }
  selectVisitDateYear(year: number) {
    this.visitDateCal.update((c) => ({ ...c, year }));
    this.visitDateView.set('month');
  }
  shiftVisitDateYears(dir: number) {
    this.visitDateYearStart.update((y) => y + dir * 12);
  }

  selectVisitDay(day: number) {
    const { year, month } = this.visitDateCal();
    const val = this.toFilterDateStr(year, month, day);
    this.form.get('visitDate')?.setValue(val);
    this.visitDateDisplay.set(this.toFilterDisplay(val));
    this.visitDatePicker.set(false);
    this.visitDateView.set('day');
  }

  isVisitDayDisabled(day: number): boolean {
    const { year, month } = this.visitDateCal();
    return this.toFilterDateStr(year, month, day) > this.today;
  }

  isVisitDaySelected(day: number): boolean {
    const { year, month } = this.visitDateCal();
    return (
      this.toFilterDateStr(year, month, day) ===
      this.form.get('visitDate')?.value
    );
  }

  clearVisitDate() {
    this.form.get('visitDate')?.setValue('');
    this.visitDateDisplay.set('');
    this.visitDatePicker.set(false);
  }

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
    public notificationService: NotificationService,
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
    let compressed: Blob;
    try {
      compressed = await this.compressImage(file);
    } catch (err: any) {
      this.errorMessage.set(err?.message || 'Khong the xu ly file anh');
      return;
    }
    const compressedFile = new File(
      [compressed],
      file.name.replace(/\.[^/.]+$/, '.jpg'),
      { type: 'image/jpeg' },
    );
    const formData = new FormData();
    formData.append(
      'file',
      file.type.startsWith('image/') ? compressedFile : file,
    );
    this.http
      .post<any>(
        `${this.apiUrl}/medical-visits/${visitId}/attachments`,
        formData,
      )
      .subscribe({
        next: (res) => {
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
        error: () => this.errorMessage.set('Upload that bai!'),
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
