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
import { NotificationService } from '../../core/services/notification.service';

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
  vaccineOpen = signal(false);
  vaccineLabel = signal('-- Chọn vaccine --');
  vaccineSearch = signal('');

  get filteredCatalog() {
    const q = this.vaccineSearch().toLowerCase();
    return q
      ? this.catalog().filter((v) => v.vaccineName.toLowerCase().includes(q))
      : this.catalog();
  }

  selectVaccine(id: number, name: string) {
    this.form.get('vaccineId')?.setValue(String(id));
    this.vaccineLabel.set(name);
    this.vaccineOpen.set(false);
    this.vaccineSearch.set('');
  }

  catalog = signal<VaccineCatalog[]>([]);
  isLoading = signal(false);
  isSubmitting = signal(false);
  showForm = signal(false);
  successMessage = signal('');
  offlineMessage = signal('');

  // Ngày hôm nay dạng yyyy-MM-dd
  readonly today = new Date().toISOString().split('T')[0];

  // Min date cho ngày hẹn = ngày tiêm + 1 ngày
  minNextDueDate = signal('');

  // Custom date picker state
  vaccinatedPicker = signal(false);
  nextDuePicker = signal(false);
  vaccinatedDisplay = signal('');
  nextDueDisplay = signal('');

  // Calendar navigation
  vacCal = signal({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  });
  nextCal = signal({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  });

  readonly MONTHS = [
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
  readonly MONTHS_SHORT = [
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
  readonly DAYS_HDR = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  // view: 'day' | 'month' | 'year'
  vacView = signal<'day' | 'month' | 'year'>('day');
  nextView = signal<'day' | 'month' | 'year'>('day');

  // year range start
  vacYearStart = signal(new Date().getFullYear() - 6);
  nextYearStart = signal(new Date().getFullYear() - 6);

  getYearRange(start: number): number[] {
    return Array.from({ length: 12 }, (_, i) => start + i);
  }

  selectMonth(picker: 'vac' | 'next', monthIdx: number) {
    if (picker === 'vac') {
      this.vacCal.update((c) => ({ ...c, month: monthIdx }));
      this.vacView.set('day');
    } else {
      this.nextCal.update((c) => ({ ...c, month: monthIdx }));
      this.nextView.set('day');
    }
  }

  selectYear(picker: 'vac' | 'next', year: number) {
    if (picker === 'vac') {
      this.vacCal.update((c) => ({ ...c, year }));
      this.vacView.set('month');
    } else {
      this.nextCal.update((c) => ({ ...c, year }));
      this.nextView.set('month');
    }
  }

  toggleView(picker: 'vac' | 'next') {
    if (picker === 'vac') {
      this.vacView.set(this.vacView() === 'day' ? 'year' : 'day');
    } else {
      this.nextView.set(this.nextView() === 'day' ? 'year' : 'day');
    }
  }

  shiftYears(picker: 'vac' | 'next', dir: number) {
    if (picker === 'vac') this.vacYearStart.update((y) => y + dir * 12);
    else this.nextYearStart.update((y) => y + dir * 12);
  }

  getCalDays(year: number, month: number): (number | null)[] {
    const first = new Date(year, month, 1).getDay();
    const total = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = Array(first).fill(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  toDateStr(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  toDisplayStr(dateStr: string): string {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }

  selectVacDate(day: number) {
    const { year, month } = this.vacCal();
    const val = this.toDateStr(year, month, day);
    this.form.get('vaccinatedDate')?.setValue(val);
    this.vaccinatedDisplay.set(this.toDisplayStr(val));
    this.vaccinatedPicker.set(false);
    this.onVaccinatedDateChange();
    // Cập nhật calendar ngày hẹn bắt đầu từ tháng sau
    const next = new Date(year, month + 1, 1);
    this.nextCal.set({ year: next.getFullYear(), month: next.getMonth() });
  }

  selectNextDate(day: number) {
    const { year, month } = this.nextCal();
    const val = this.toDateStr(year, month, day);
    this.form.get('nextDueDate')?.setValue(val);
    this.nextDueDisplay.set(this.toDisplayStr(val));
    this.nextDuePicker.set(false);
  }

  prevMonth(picker: 'vac' | 'next') {
    if (picker === 'vac') {
      const { year, month } = this.vacCal();
      const d = new Date(year, month - 1, 1);
      this.vacCal.set({ year: d.getFullYear(), month: d.getMonth() });
    } else {
      const { year, month } = this.nextCal();
      const d = new Date(year, month - 1, 1);
      this.nextCal.set({ year: d.getFullYear(), month: d.getMonth() });
    }
  }

  nextMonth(picker: 'vac' | 'next') {
    if (picker === 'vac') {
      const { year, month } = this.vacCal();
      const d = new Date(year, month + 1, 1);
      this.vacCal.set({ year: d.getFullYear(), month: d.getMonth() });
    } else {
      const { year, month } = this.nextCal();
      const d = new Date(year, month + 1, 1);
      this.nextCal.set({ year: d.getFullYear(), month: d.getMonth() });
    }
  }

  isVacDayDisabled(day: number): boolean {
    const { year, month } = this.vacCal();
    return this.toDateStr(year, month, day) > this.today;
  }

  isNextDayDisabled(day: number): boolean {
    const { year, month } = this.nextCal();
    const val = this.toDateStr(year, month, day);
    return val <= (this.form.get('vaccinatedDate')?.value || this.today);
  }

  isVacSelected(day: number): boolean {
    const { year, month } = this.vacCal();
    return (
      this.toDateStr(year, month, day) ===
      this.form.get('vaccinatedDate')?.value
    );
  }

  isNextSelected(day: number): boolean {
    const { year, month } = this.nextCal();
    return (
      this.toDateStr(year, month, day) === this.form.get('nextDueDate')?.value
    );
  }

  isToday(year: number, month: number, day: number): boolean {
    return this.toDateStr(year, month, day) === this.today;
  }

  onVaccinatedDateChange() {
    const vacDate = this.form.get('vaccinatedDate')?.value;
    if (vacDate) {
      // Cộng thêm 1 ngày vào ngày tiêm
      const d = new Date(vacDate);
      d.setDate(d.getDate() + 1);
      this.minNextDueDate.set(d.toISOString().split('T')[0]);
    } else {
      this.minNextDueDate.set('');
    }
    // Reset ngày hẹn nếu đang chọn ngày không hợp lệ
    const nextDate = this.form.get('nextDueDate')?.value;
    if (nextDate && nextDate <= vacDate!) {
      this.form.get('nextDueDate')?.setValue('');
    }
  }

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
    public notificationService: NotificationService,
  ) {}

  ngOnInit() {
    this.loadCatalog();
    this.loadSchedule();
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
