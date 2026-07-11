import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { VitalSign } from '../models/health-record.model';

@Injectable({ providedIn: 'root' })
export class PdfExportService {
  async exportHealthReport(
    user: { fullname: string; email: string; role: string },
    vitalSigns: VitalSign[],
  ): Promise<void> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageW = 210;
    const margin = 18;
    const contentW = pageW - margin * 2;
    let y = 0;

    // ─── Helper functions ─────────────────────────────
    const setFont = (style: 'normal' | 'bold', size: number) => {
      doc.setFont('helvetica', style);
      doc.setFontSize(size);
    };

    const setColor = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      doc.setTextColor(r, g, b);
      return { r, g, b };
    };

    const fillRect = (
      x: number,
      yy: number,
      w: number,
      h: number,
      hex: string,
    ) => {
      const { r, g, b } = setColor(hex);
      doc.setFillColor(r, g, b);
      doc.roundedRect(x, yy, w, h, 2, 2, 'F');
    };

    const drawLine = (yy: number, hex = '#E5E7EB') => {
      const { r, g, b } = setColor(hex);
      doc.setDrawColor(r, g, b);
      doc.setLineWidth(0.3);
      doc.line(margin, yy, pageW - margin, yy);
    };

    const text = (txt: string, x: number, yy: number) => doc.text(txt, x, yy);

    const bmiStatus = (bmi: number) => {
      if (bmi < 18.5) return { label: 'Thieu can', color: '#3B82F6' };
      if (bmi < 25) return { label: 'Binh thuong', color: '#22C55E' };
      if (bmi < 30) return { label: 'Thua can', color: '#EAB308' };
      return { label: 'Beo phi', color: '#EF4444' };
    };

    const bpStatus = (sys: number) => {
      if (sys < 120) return { label: 'Binh thuong', color: '#22C55E' };
      if (sys < 130) return { label: 'Cao ranh gioi', color: '#EAB308' };
      return { label: 'Cao', color: '#EF4444' };
    };

    // ─── HEADER ───────────────────────────────────────
    fillRect(0, 0, pageW, 38, '#4F46E5');
    setFont('bold', 20);
    setColor('#FFFFFF');
    text('Health+ (VitaTrack)', margin, 16);

    setFont('normal', 10);
    setColor('#C7D2FE');
    text('Bao cao suc khoe ca nhan', margin, 23);

    setFont('bold', 11);
    setColor('#FFFFFF');
    text(user.fullname, margin, 31);

    setFont('normal', 9);
    setColor('#C7D2FE');
    text(user.email, margin, 36);

    const dateStr = new Date().toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const dateLabel = `Ngay xuat: ${dateStr}`;
    setFont('normal', 9);
    setColor('#C7D2FE');
    text(dateLabel, pageW - margin - doc.getTextWidth(dateLabel), 36);

    y = 48;

    // ─── LATEST VITAL SIGNS SUMMARY ─────────────────
    const latest =
      vitalSigns.length > 0 ? vitalSigns[vitalSigns.length - 1] : null;

    setFont('bold', 13);
    setColor('#1F2937');
    text('Chi so sinh ton gan nhat', margin, y);
    y += 3;
    drawLine(y);
    y += 6;

    if (!latest) {
      setFont('normal', 10);
      setColor('#9CA3AF');
      text('Chua co du lieu chi so sinh ton.', margin, y);
      y += 12;
    } else {
      const recordDate = new Date(latest.recordedAt).toLocaleDateString(
        'vi-VN',
      );

      setFont('normal', 8);
      setColor('#6B7280');
      text(`Do ngay: ${recordDate}`, margin, y);
      y += 7;

      // 4-card summary grid (BMI, Weight, BP, Heart)
      const cards = [
        {
          label: 'BMI',
          value: latest.bmi ? String(latest.bmi) : '-',
          sub: latest.bmi ? bmiStatus(latest.bmi).label : '',
          subColor: latest.bmi ? bmiStatus(latest.bmi).color : '#9CA3AF',
        },
        {
          label: 'Can nang (kg)',
          value: latest.weightKg ? String(latest.weightKg) : '-',
          sub: latest.heightCm ? `Chieu cao: ${latest.heightCm}cm` : '',
          subColor: '#6B7280',
        },
        {
          label: 'Huyet ap (mmHg)',
          value:
            latest.systolicBp && latest.diastolicBp
              ? `${latest.systolicBp}/${latest.diastolicBp}`
              : '-',
          sub: latest.systolicBp ? bpStatus(latest.systolicBp).label : '',
          subColor: latest.systolicBp
            ? bpStatus(latest.systolicBp).color
            : '#9CA3AF',
        },
        {
          label: 'Nhip tim (bpm)',
          value: latest.heartRate ? String(latest.heartRate) : '-',
          sub:
            latest.heartRate &&
            latest.heartRate >= 60 &&
            latest.heartRate <= 100
              ? 'Binh thuong'
              : latest.heartRate
                ? 'Bat thuong'
                : '',
          subColor:
            latest.heartRate &&
            latest.heartRate >= 60 &&
            latest.heartRate <= 100
              ? '#22C55E'
              : '#EF4444',
        },
      ];

      const cardW = (contentW - 9) / 4;
      cards.forEach((card, i) => {
        const cx = margin + i * (cardW + 3);
        fillRect(cx, y, cardW, 22, '#F9FAFB');
        setFont('normal', 7);
        setColor('#6B7280');
        text(card.label, cx + 3, y + 6);
        setFont('bold', 13);
        setColor('#111827');
        text(card.value, cx + 3, y + 15);
        if (card.sub) {
          setFont('normal', 7);
          setColor(card.subColor);
          text(card.sub, cx + 3, y + 20);
        }
      });
      y += 28;

      // Extra metrics row
      const extras = [
        {
          label: 'Nhiet do',
          value: latest.temperature ? `${latest.temperature}C` : '-',
        },
        {
          label: 'Duong huyet',
          value: latest.bloodSugar ? `${latest.bloodSugar} mg/dL` : '-',
        },
      ];
      if (extras.some((e) => e.value !== '-')) {
        setFont('normal', 9);
        extras.forEach((ex, i) => {
          const ex_x = margin + i * 60;
          setColor('#6B7280');
          text(`${ex.label}: `, ex_x, y);
          setFont('bold', 9);
          setColor('#1F2937');
          text(ex.value, ex_x + doc.getTextWidth(`${ex.label}: `), y);
          setFont('normal', 9);
        });
        y += 10;
      }
    }

    // ─── BMI TREND TABLE ─────────────────────────────
    y += 4;
    setFont('bold', 13);
    setColor('#1F2937');
    text('Xu huong BMI (5 lan do gan nhat)', margin, y);
    y += 3;
    drawLine(y);
    y += 5;

    const recent = [...vitalSigns].slice(-5).reverse();

    if (recent.length === 0) {
      setFont('normal', 10);
      setColor('#9CA3AF');
      text('Chua co du lieu.', margin, y);
      y += 10;
    } else {
      const cols = [
        'Ngay do',
        'BMI',
        'Phan loai',
        'Can nang',
        'Huyet ap',
        'Nhip tim',
      ];
      const colW = [36, 20, 34, 28, 34, 28];

      // Header row
      fillRect(margin, y, contentW, 8, '#4F46E5');
      setFont('bold', 8);
      setColor('#FFFFFF');
      let cx = margin + 3;
      cols.forEach((col, i) => {
        text(col, cx, y + 5.5);
        cx += colW[i];
      });
      y += 8;

      recent.forEach((v, idx) => {
        const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
        fillRect(margin, y, contentW, 8, rowBg);

        setFont('normal', 8);
        setColor('#374151');

        const date = new Date(v.recordedAt).toLocaleDateString('vi-VN');
        const bmiVal = v.bmi ? String(v.bmi) : '-';
        const bmiLbl = v.bmi ? bmiStatus(v.bmi).label : '-';
        const bmiCol = v.bmi ? bmiStatus(v.bmi).color : '#9CA3AF';
        const wt = v.weightKg ? `${v.weightKg} kg` : '-';
        const bp =
          v.systolicBp && v.diastolicBp
            ? `${v.systolicBp}/${v.diastolicBp}`
            : '-';
        const hr = v.heartRate ? `${v.heartRate}` : '-';

        const rowData = [date, bmiVal, bmiLbl, wt, bp, hr];
        const rowColors = [
          '#374151',
          '#374151',
          bmiCol,
          '#374151',
          '#374151',
          '#374151',
        ];

        cx = margin + 3;
        rowData.forEach((val, i) => {
          setColor(rowColors[i]);
          if (i === 2) setFont('bold', 8);
          else setFont('normal', 8);
          text(val, cx, y + 5.5);
          cx += colW[i];
        });
        y += 8;
      });
    }

    // ─── WHO GUIDELINES ──────────────────────────────
    y += 8;
    setFont('bold', 13);
    setColor('#1F2937');
    text('Nguong tham chieu WHO', margin, y);
    y += 3;
    drawLine(y);
    y += 5;

    const guidelines = [
      {
        metric: 'BMI',
        normal: '18.5 - 24.9',
        low: '< 18.5 (Thieu can)',
        high: '>= 25 (Thua can / Beo phi)',
      },
      {
        metric: 'Huyet ap',
        normal: '90/60 - 120/80 mmHg',
        low: '< 90/60 (Thap)',
        high: '> 130/80 (Cao)',
      },
      {
        metric: 'Nhip tim',
        normal: '60 - 100 bpm',
        low: '< 60 (Cham)',
        high: '> 100 (Nhanh)',
      },
      {
        metric: 'Nhiet do',
        normal: '36.1 - 37.2 deg C',
        low: '< 36.1 (Ha than)',
        high: '> 37.2 (Sot)',
      },
    ];

    const gCols = ['Chi so', 'Binh thuong (WHO)', 'Thap', 'Cao'];
    const gWidths = [32, 52, 44, 44];

    fillRect(margin, y, contentW, 7, '#064E3B');
    setFont('bold', 8);
    setColor('#FFFFFF');
    let gcx = margin + 3;
    gCols.forEach((col, i) => {
      text(col, gcx, y + 4.8);
      gcx += gWidths[i];
    });
    y += 7;

    guidelines.forEach((g, idx) => {
      fillRect(margin, y, contentW, 7, idx % 2 === 0 ? '#FFFFFF' : '#F0FDF4');
      setFont('normal', 7.5);
      let gcx2 = margin + 3;
      const vals = [g.metric, g.normal, g.low, g.high];
      const colors = ['#1F2937', '#15803D', '#3B82F6', '#DC2626'];
      vals.forEach((v, i) => {
        setColor(colors[i]);
        text(v, gcx2, y + 4.8);
        gcx2 += gWidths[i];
      });
      y += 7;
    });

    // ─── FOOTER ──────────────────────────────────────
    y = 282;
    drawLine(y, '#E5E7EB');
    setFont('normal', 7.5);
    setColor('#9CA3AF');
    const footer = `Health+ (VitaTrack)  |  Bao cao nay chi mang tinh tham khao, khong thay the y kien bac si.`;
    text(footer, margin, y + 4);

    const pageNum = `Trang 1/1`;
    text(pageNum, pageW - margin - doc.getTextWidth(pageNum), y + 4);

    // ─── SAVE ────────────────────────────────────────
    const filename = `HealthPlus_BaoCao_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
  }
}
