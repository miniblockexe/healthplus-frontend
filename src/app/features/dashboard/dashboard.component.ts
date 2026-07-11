import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { environment } from '../../../environments/environment';
import { PdfExportService } from '../../core/services/pdf-export.service';
import { ApiResponse } from '../../core/models/api-response.model';
import { VitalSign } from '../../core/models/health-record.model';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexNonAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexStroke,
  ApexTooltip,
  ApexDataLabels,
  ApexYAxis,
  ApexLegend,
  ApexFill,
} from 'ng-apexcharts';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, NgApexchartsModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private apiUrl = environment.apiUrl;

  vitalSigns = signal<VitalSign[]>([]);
  isLoading = signal(false);
  isExportingPdf = signal(false);
  today = new Date();

  // BMI Chart
  bmiChartOptions: any = {};
  bpChartOptions: any = {};

  constructor(
    public authService: AuthService,
    private http: HttpClient,
    private pdfExportService: PdfExportService,
  ) {}

  ngOnInit() {
    this.loadChartData();
  }

  loadChartData() {
    this.isLoading.set(true);
    this.http
      .get<ApiResponse<VitalSign[]>>(`${this.apiUrl}/health-records/chart-data`)
      .subscribe({
        next: (res) => {
          this.vitalSigns.set(res.data);
          this.buildCharts(res.data);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
  }

  buildCharts(data: VitalSign[]) {
    const dates = data.map((v) =>
      new Date(v.recordedAt).toLocaleDateString('vi-VN'),
    );

    // BMI Chart + Đường chuẩn WHO
    this.bmiChartOptions = {
      series: [
        {
          name: 'BMI của bạn',
          data: data.map((v) => v.bmi || 0),
        },
        {
          name: 'Cân nặng (kg)',
          data: data.map((v) => v.weightKg || 0),
        },
        {
          name: 'WHO - Bình thường (Max 24.9)',
          data: data.map(() => 24.9),
        },
        {
          name: 'WHO - Thiếu cân (Min 18.5)',
          data: data.map(() => 18.5),
        },
      ],
      chart: {
        type: 'line',
        height: 280,
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      stroke: {
        curve: 'smooth',
        width: [3, 3, 2, 2],
        dashArray: [0, 0, 5, 5], // Đường WHO dạng nét đứt
      },
      xaxis: { categories: dates },
      colors: ['#6366f1', '#8b5cf6', '#22c55e', '#f97316'],
      tooltip: { theme: 'light' },
      legend: { position: 'top' },
      dataLabels: { enabled: false },
      annotations: {
        yaxis: [
          {
            y: 18.5,
            y2: 24.9,
            fillColor: '#22c55e',
            opacity: 0.1,
            label: {
              text: 'Vùng bình thường WHO',
              style: { color: '#22c55e', fontSize: '11px' },
            },
          },
        ],
      },
    };

    // Blood Pressure Chart + Đường chuẩn WHO
    this.bpChartOptions = {
      series: [
        {
          name: 'Tâm thu (mmHg)',
          data: data.map((v) => v.systolicBp || 0),
        },
        {
          name: 'Tâm trương (mmHg)',
          data: data.map((v) => v.diastolicBp || 0),
        },
        {
          name: 'Nhịp tim (bpm)',
          data: data.map((v) => v.heartRate || 0),
        },
        {
          name: 'WHO - HA tâm thu chuẩn (120)',
          data: data.map(() => 120),
        },
        {
          name: 'WHO - HA tâm trương chuẩn (80)',
          data: data.map(() => 80),
        },
      ],
      chart: {
        type: 'area',
        height: 280,
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      stroke: {
        curve: 'smooth',
        width: [2, 2, 2, 1, 1],
        dashArray: [0, 0, 0, 5, 5], // Đường WHO dạng nét đứt
      },
      fill: {
        type: ['gradient', 'gradient', 'gradient', 'solid', 'solid'],
        gradient: { opacityFrom: 0.4, opacityTo: 0 },
      },
      xaxis: { categories: dates },
      colors: ['#ef4444', '#f97316', '#22c55e', '#94a3b8', '#64748b'],
      tooltip: { theme: 'light' },
      legend: { position: 'top' },
      dataLabels: { enabled: false },
      annotations: {
        yaxis: [
          {
            y: 80,
            y2: 120,
            fillColor: '#22c55e',
            opacity: 0.05,
            label: {
              text: 'Vùng huyết áp bình thường',
              style: { color: '#22c55e', fontSize: '11px' },
            },
          },
        ],
      },
    };
  }

  get latestVital(): VitalSign | null {
    const list = this.vitalSigns();
    return list.length > 0 ? list[list.length - 1] : null;
  }

  getBmiStatus(bmi: number): { label: string; color: string } {
    if (bmi < 18.5) return { label: 'Thiếu cân', color: 'text-blue-500' };
    if (bmi < 25) return { label: 'Bình thường', color: 'text-green-500' };
    if (bmi < 30) return { label: 'Thừa cân', color: 'text-yellow-500' };
    return { label: 'Béo phì', color: 'text-red-500' };
  }

  async exportPdf() {
    if (this.isExportingPdf()) return;
    const user = this.authService.currentUser();
    if (!user) return;
    this.isExportingPdf.set(true);
    try {
      await this.pdfExportService.exportHealthReport(user, this.vitalSigns());
    } finally {
      this.isExportingPdf.set(false);
    }
  }
}
