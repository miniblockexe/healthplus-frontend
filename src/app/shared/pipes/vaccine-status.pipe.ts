import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'vaccineStatus',
  standalone: true,
})
export class VaccineStatusPipe implements PipeTransform {
  transform(status: string): { label: string; color: string; icon: string } {
    switch (status) {
      case 'done':
        return {
          label: 'Đã tiêm',
          color: 'bg-green-100 text-green-700',
          icon: 'fa-check-circle',
        };
      case 'overdue':
        return {
          label: 'Trễ lịch',
          color: 'bg-red-100 text-red-700',
          icon: 'fa-exclamation-circle',
        };
      default:
        return {
          label: 'Chờ tiêm',
          color: 'bg-yellow-100 text-yellow-700',
          icon: 'fa-clock',
        };
    }
  }
}