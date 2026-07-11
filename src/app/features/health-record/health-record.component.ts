import {
  Component,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { VitalSign } from '../../core/models/health-record.model';
import { ApiResponse } from '../../core/models/api-response.model';
import { OfflineService } from '../../core/services/offline.service';

@Component({
  selector: 'app-health-record',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './health-record.component.html',
})
export class HealthRecordComponent implements OnInit {
  private apiUrl = environment.apiUrl;

  vitalSigns = signal<VitalSign[]>([]);
  isLoading = signal(false);
  isSubmitting = signal(false);
  showForm = signal(false);
  successMessage = signal('');
  offlineMessage = signal('');

  form = this.fb.group({
    heightCm: [''],
    weightKg: [''],
    systolicBp: [''],
    diastolicBp: [''],
    heartRate: [''],
    temperature: [''],
    bloodSugar: [''],
    note: [''],
  });

  // ─── BMI LIVE-PREVIEW ────────────────────────────────────────
  // Bridge ReactiveForm → Signal world bằng toSignal() từ rxjs-interop.
  // Mỗi lần user gõ vào ô chiều cao / cân nặng, signal tự cập nhật
  // -> computed() bên dưới tự tính lại BMI không cần submit.
  private heightCm$ = toSignal(
    this.form
      .get('heightCm')!
      .valueChanges.pipe(map((v) => parseFloat(v as string) || 0)),
    { initialValue: 0 },
  );

  private weightKg$ = toSignal(
    this.form
      .get('weightKg')!
      .valueChanges.pipe(map((v) => parseFloat(v as string) || 0)),
    { initialValue: 0 },
  );

  // computed() — Angular tự memoize, chỉ tính lại khi heightCm$ hoặc weightKg$ thay đổi.
  // Trả về null nếu chưa nhập đủ 2 giá trị hợp lệ.
  bmiPreview = computed<number | null>(() => {
    const h = this.heightCm$();
    const w = this.weightKg$();
    if (h <= 0 || w <= 0) return null;
    const hm = h / 100;
    return Math.round((w / (hm * hm)) * 10) / 10;
  });

  // computed() thứ 2 phụ thuộc vào computed() đầu — Angular chain tự động.
  bmiStatus = computed(() => {
    const bmi = this.bmiPreview();
    return bmi !== null ? this.getBmiStatus(bmi) : null;
  });
  // ─────────────────────────────────────────────────────────────

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    public offlineService: OfflineService,
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);

    if (!this.offlineService.isOnline()) {
      this.offlineService.getVitalSigns().then((data) => {
        this.vitalSigns.set(data);
        this.offlineMessage.set('📴 Đang xem dữ liệu offline');
        this.isLoading.set(false);
      });
      return;
    }

    this.http
      .get<
        ApiResponse<VitalSign[]>
      >(`${this.apiUrl}/health-records/vital-signs`)
      .subscribe({
        next: (res) => {
          this.vitalSigns.set(res.data);
          this.isLoading.set(false);
        },
        error: async () => {
          const data = await this.offlineService.getVitalSigns();
          this.vitalSigns.set(data);
          this.offlineMessage.set(
            '📴 Không thể kết nối server, hiển thị dữ liệu offline',
          );
          this.isLoading.set(false);
        },
      });
  }

  onSubmit() {
    this.isSubmitting.set(true);
    this.successMessage.set('');

    const val = this.form.value;
    const body: any = {};
    if (val.heightCm) body.heightCm = +val.heightCm;
    if (val.weightKg) body.weightKg = +val.weightKg;
    if (val.systolicBp) body.systolicBp = +val.systolicBp;
    if (val.diastolicBp) body.diastolicBp = +val.diastolicBp;
    if (val.heartRate) body.heartRate = +val.heartRate;
    if (val.temperature) body.temperature = +val.temperature;
    if (val.bloodSugar) body.bloodSugar = +val.bloodSugar;
    if (val.note) body.note = val.note;

    if (!this.offlineService.isOnline()) {
      this.offlineService.saveVitalSign(body).then(async (saved) => {
        await this.offlineService.addToSyncQueue({
          entityType: 'vital_sign',
          action: 'CREATE',
          payload: body,
          status: 'pending',
          createdAt: new Date().toISOString(),
        });
        this.vitalSigns.update((list) => [
          { ...body, id: saved, recordedAt: new Date().toISOString() },
          ...list,
        ]);
        this.form.reset();
        this.showForm.set(false);
        this.successMessage.set('💾 Đã lưu offline! Sẽ đồng bộ khi có mạng.');
        this.isSubmitting.set(false);
      });
      return;
    }

    this.http
      .post<
        ApiResponse<VitalSign>
      >(`${this.apiUrl}/health-records/vital-signs`, body)
      .subscribe({
        next: async (res) => {
          await this.offlineService.saveVitalSign(res.data);
          this.vitalSigns.update((list) => [res.data, ...list]);
          this.form.reset();
          this.showForm.set(false);
          this.successMessage.set('✅ Thêm chỉ số thành công!');
          this.isSubmitting.set(false);
          setTimeout(() => this.successMessage.set(''), 3000);
        },
        error: () => this.isSubmitting.set(false),
      });
  }

  deleteVitalSign(id: number) {
    this.http
      .delete<
        ApiResponse<any>
      >(`${this.apiUrl}/health-records/vital-signs/${id}`)
      .subscribe({
        next: () => {
          this.vitalSigns.update((list) => list.filter((v) => v.id !== id));
        },
      });
  }

  getBmiStatus(bmi: number): { label: string; color: string; bg: string } {
    if (bmi < 18.5)
      return { label: 'Thiếu cân', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (bmi < 25)
      return {
        label: 'Bình thường',
        color: 'text-green-600',
        bg: 'bg-green-50',
      };
    if (bmi < 30)
      return {
        label: 'Thừa cân',
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
      };
    return { label: 'Béo phì', color: 'text-red-600', bg: 'bg-red-50' };
  }

  // % vị trí thanh BMI (clamp 10–45 → 0–100%)
  bmiBarPercent(bmi: number): number {
    return Math.min(100, Math.max(0, ((bmi - 10) / 35) * 100));
  }
}
