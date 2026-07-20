import { Component, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { PushNotificationService } from '../../../core/services/push-notification.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Notification } from '../../../core/services/notification.service';

interface MenuItem {
  path: string;
  icon: string;
  label: string;
  roles: ('user' | 'doctor' | 'admin')[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  isCollapsed = signal(false);
  showNotifications = this.notificationService.showPanel;

  isMobileView = signal(
    typeof window !== 'undefined' && window.innerWidth < 640,
  );

  @HostListener('window:resize')
  onResize() {
    this.isMobileView.set(window.innerWidth < 640);
  }

  private allMenuItems: MenuItem[] = [
    {
      path: '/dashboard',
      icon: 'fa-home',
      label: 'Dashboard',
      roles: ['user', 'doctor', 'admin'],
    },
    {
      path: '/health-record',
      icon: 'fa-heartbeat',
      label: 'Hồ sơ sức khỏe',
      roles: ['user'],
    },
    {
      path: '/medical-history',
      icon: 'fa-notes-medical',
      label: 'Lịch sử khám',
      roles: ['user'],
    },
    { path: '/vaccine', icon: 'fa-syringe', label: 'Vaccine', roles: ['user'] },
    {
      path: '/ai-health',
      icon: 'fa-robot',
      label: 'AI Suc Khoe',
      roles: ['user', 'doctor', 'admin'],
    },
    {
      path: '/profile',
      icon: 'fa-user-circle',
      label: 'Hồ sơ cá nhân',
      roles: ['user', 'doctor', 'admin'],
    },
    {
      path: '/doctor',
      icon: 'fa-user-md',
      label: 'Bệnh nhân',
      roles: ['doctor', 'admin'],
    },
    {
      path: '/admin',
      icon: 'fa-shield-alt',
      label: 'Admin Panel',
      roles: ['admin'],
    },
  ];

  menuItems = computed(() => {
    const role = this.authService.currentUser()?.role as
      | 'user'
      | 'doctor'
      | 'admin';
    if (!role) return [];
    return this.allMenuItems.filter((item) => item.roles.includes(role));
  });

  constructor(
    public authService: AuthService,
    public pushService: PushNotificationService,
    public notificationService: NotificationService,
    private router: Router,
  ) {}

  toggle() {
    this.isCollapsed.update((v) => !v);
  }

  logout() {
    this.authService.logout();
  }

  toggleNotifications() {
    this.notificationService.togglePanel();
  }

  closeNotifications() {
    this.notificationService.closePanel();
  }

  onNotificationClick(notification: Notification) {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id);
    }
    if (notification.link) {
      this.router.navigate([notification.link]);
    }
    this.notificationService.closePanel();
  }

  async subscribePush() {
    try {
      await this.pushService.subscribe();
      alert('Đăng ký push notification thành công!');
    } catch {
      alert('Cần HTTPS hoặc localhost với Service Worker');
    }
  }

  async testPush() {
    await this.pushService.testPush();
    alert('📬 Đã gửi push notification test!');
  }
}
