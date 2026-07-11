import { Component, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { User } from '../../core/models/user.model';
import { ApiResponse } from '../../core/models/api-response.model';

@Component({
  selector: 'app-doctor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  templateUrl: './doctor.component.html',
})
export class DoctorComponent implements OnInit {
  private apiUrl = environment.apiUrl;

  patients = signal<User[]>([]);
  isLoading = signal(false);
  searchQuery = signal('');

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadPatients();
  }

  loadPatients() {
    this.isLoading.set(true);
    this.http
      .get<ApiResponse<User[]>>(`${this.apiUrl}/users/patients`)
      .subscribe({
        next: (res) => {
          this.patients.set(res.data);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
  }

  get filteredPatients() {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.patients();
    return this.patients().filter(p =>
      p.fullname.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q)
    );
  }

  onSearch(event: any) {
    this.searchQuery.set(event.target.value);
  }
}