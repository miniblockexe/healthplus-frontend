import {
  Component,
  signal,
  computed,
  HostListener,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  RouterLink,
  RouterLinkActive,
  Router,
  NavigationStart,
  NavigationEnd,
} from '@angular/router';
import { filter, Subscription } from 'rxjs';
import gsap from 'gsap';
import { AuthService } from '../../../core/auth/auth.service';
import { PushNotificationService } from '../../../core/services/push-notification.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Notification } from '../../../core/services/notification.service';
import { sidebarEnter } from '../../utils/page-transition';

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
export class SidebarComponent implements OnInit, OnDestroy {
  isCollapsed = signal(false);
  showNotifications = this.notificationService.showPanel;

  isMobileView = signal(
    typeof window !== 'undefined' && window.innerWidth < 640,
  );

  private routerSub!: Subscription;
  private readonly MAIN_SEL = '.hp-main-content';

  @HostListener('window:resize')
  onResize() {
    this.isMobileView.set(window.innerWidth < 640);
  }

  ngOnInit() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Stagger nav items in on load
    setTimeout(() => sidebarEnter('.hp-nav-item'), 80);

    this.routerSub = this.router.events
      .pipe(
        filter(
          (e) => e instanceof NavigationStart || e instanceof NavigationEnd,
        ),
      )
      .subscribe((event) => {
        const el = document.querySelector<HTMLElement>(this.MAIN_SEL);
        if (!el) return;

        if (event instanceof NavigationStart) {
          gsap.killTweensOf(el);
          gsap.to(el, {
            opacity: 0,
            y: -6,
            duration: 0.15,
            ease: 'power2.in',
          });
        } else {
          // Re-stagger nav items after route change (active item changes)
          setTimeout(() => sidebarEnter('.hp-nav-item'), 50);

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const fresh = document.querySelector<HTMLElement>(this.MAIN_SEL);
              if (!fresh) return;
              gsap.killTweensOf(fresh);
              gsap.fromTo(
                fresh,
                { opacity: 0, y: 12 },
                { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' },
              );
            });
          });
        }
      });
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
    const el = document.querySelector<HTMLElement>(this.MAIN_SEL);
    if (el) gsap.set(el, { clearProps: 'opacity,transform' });
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
      label: 'AI Sức Khỏe',
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
    alert('Đã gửi push notification test!');
  }
}
