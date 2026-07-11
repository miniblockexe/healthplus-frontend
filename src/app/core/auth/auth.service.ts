import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from '../models/user.model';
import { ApiResponse } from '../models/api-response.model';
import { EncryptionService } from '../services/encryption.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl;

  private currentUserSignal = signal<User | null>(null);
  private accessTokenSignal = signal<string | null>(null);

  currentUser = computed(() => this.currentUserSignal());
  isLoggedIn = computed(() => !!this.accessTokenSignal());
  accessToken = computed(() => this.accessTokenSignal());

  constructor(
    private http: HttpClient,
    private router: Router,
    private encryptionService: EncryptionService,
  ) {
    this.restoreSession();
  }

  register(data: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${this.apiUrl}/auth/register`, data)
      .pipe(tap((res) => this.saveSession(res.data)));
  }

  login(data: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${this.apiUrl}/auth/login`, data)
      .pipe(tap((res) => this.saveSession(res.data)));
  }

  refreshToken(): Observable<ApiResponse<AuthResponse>> {
    const refreshToken = localStorage.getItem('refreshToken');
    return this.http
      .post<
        ApiResponse<AuthResponse>
      >(`${this.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(
        tap((res) => {
          this.accessTokenSignal.set(res.data.accessToken);
          localStorage.setItem('accessToken', res.data.accessToken);
        }),
      );
  }

  // Xử lý kết quả redirect từ Google OAuth
  handleGoogleCallback(accessToken: string, refreshToken: string, user: User): void {
    this.saveSession({ accessToken, refreshToken, user });
  }

  // Cap nhat user signal sau khi thay doi avatar/profile
  updateCurrentUser(user: any) {
    this.currentUserSignal.set(user);
    this.encryptionService.setEncrypted('currentUser', user);
  }

  logout(): void {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      this.http
        .post(`${this.apiUrl}/auth/logout`, { refreshToken })
        .subscribe();
    }
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  private saveSession(data: AuthResponse): void {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    // Mã hóa user info trước khi lưu
    this.encryptionService.setEncrypted('currentUser', data.user);
    this.accessTokenSignal.set(data.accessToken);
    this.currentUserSignal.set(data.user);
  }

  private clearSession(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    this.accessTokenSignal.set(null);
    this.currentUserSignal.set(null);
  }

  private restoreSession(): void {
    const token = localStorage.getItem('accessToken');
    if (token) this.accessTokenSignal.set(token);
    // Giải mã user info từ localStorage
    const user = this.encryptionService.getDecrypted('currentUser');
    if (user) this.currentUserSignal.set(user);
  }
}
