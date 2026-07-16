import { Injectable, signal, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { interval, Subject, Subscription } from 'rxjs';
import { switchMap, takeUntil, filter } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { toObservable } from '@angular/core/rxjs-interop';

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private apiUrl = environment.apiUrl;

  notifications = signal<Notification[]>([]);
  unreadCount = signal(0);
  showPanel = signal(false);

  togglePanel(): void {
    this.showPanel.update((v) => !v);
    if (this.showPanel()) {
      this.loadNotifications();
    }
  }

  closePanel(): void {
    this.showPanel.set(false);
  }

  // Subject dùng để hủy interval khi logout
  private destroy$ = new Subject<void>();
  private pollSub?: Subscription;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {
    // Theo dõi trạng thái đăng nhập:
    // - Khi login: khởi động polling
    // - Khi logout: dừng polling, reset state
    toObservable(this.authService.isLoggedIn).subscribe((loggedIn) => {
      if (loggedIn) {
        this.startPolling();
      } else {
        this.stopPolling();
        this.notifications.set([]);
        this.unreadCount.set(0);
      }
    });
  }

  private startPolling(): void {
    // Hủy subscription cũ nếu đang chạy (tránh duplicate interval)
    this.stopPolling();

    // Load ngay lập tức một lần
    this.loadNotifications();

    // Sau đó poll mỗi 30 giây, tự dừng khi destroy$ emit
    this.pollSub = interval(30000)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() =>
          this.http.get<any>(`${this.apiUrl}/notifications/unread-count`),
        ),
      )
      .subscribe((res) => this.unreadCount.set(res.data.count));
  }

  private stopPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = undefined;
  }

  loadNotifications(): void {
    this.http.get<any>(`${this.apiUrl}/notifications`).subscribe({
      next: (res) => {
        this.notifications.set(res.data);
        this.unreadCount.set(
          res.data.filter((n: Notification) => !n.isRead).length,
        );
      },
    });
  }

  markAsRead(id: number): void {
    this.http.patch(`${this.apiUrl}/notifications/${id}/read`, {}).subscribe({
      next: () => {
        this.notifications.update((list) =>
          list.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        );
        this.unreadCount.update((c) => Math.max(0, c - 1));
      },
    });
  }

  markAllAsRead(): void {
    this.http.patch(`${this.apiUrl}/notifications/read-all`, {}).subscribe({
      next: () => {
        this.notifications.update((list) =>
          list.map((n) => ({ ...n, isRead: true })),
        );
        this.unreadCount.set(0);
      },
    });
  }

  delete(id: number): void {
    this.http.delete(`${this.apiUrl}/notifications/${id}`).subscribe({
      next: () => {
        this.notifications.update((list) => list.filter((n) => n.id !== id));
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
