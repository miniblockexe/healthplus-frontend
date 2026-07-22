import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  signal,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import {
  authEnter,
  heartbeatPulse,
  shakeError,
} from '../../../shared/utils/page-transition';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent implements OnInit, AfterViewInit, OnDestroy {
  isLoading = signal(false);
  errorMessage = signal('');
  genderOpen = signal(false);
  genderLabel = signal('Chọn giới tính');

  readonly steps = [
    { n: 1, title: 'Tạo tài khoản', sub: 'Điền thông tin cơ bản' },
    {
      n: 2,
      title: 'Nhập hồ sơ sức khỏe',
      sub: 'Nhóm máu, dị ứng, tiền sử bệnh',
    },
    { n: 3, title: 'Bắt đầu theo dõi', sub: 'Dashboard, AI, nhắc lịch' },
  ];

  form = this.fb.group({
    fullname: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    gender: [''],
    phone: [''],
  });

  private viewportHandler: (() => void) | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private ngZone: NgZone,
  ) {}

  ngOnInit() {}

  ngAfterViewInit() {
    authEnter();
    heartbeatPulse('.hp-heartbeat-icon');

    if (window.innerWidth < 1024) {
      this.ngZone.runOutsideAngular(() => {
        document.querySelectorAll<HTMLElement>('input').forEach((input) => {
          input.addEventListener('focus', () => {
            setTimeout(
              () =>
                input.scrollIntoView({ behavior: 'smooth', block: 'center' }),
              320,
            );
          });
        });

        if (window.visualViewport) {
          this.viewportHandler = () => {
            const active = document.activeElement as HTMLElement;
            if (active?.tagName === 'INPUT') {
              setTimeout(
                () =>
                  active.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                  }),
                100,
              );
            }
          };
          window.visualViewport.addEventListener(
            'resize',
            this.viewportHandler,
          );
        }
      });
    }
  }

  ngOnDestroy() {
    if (window.visualViewport && this.viewportHandler) {
      window.visualViewport.removeEventListener('resize', this.viewportHandler);
    }
  }

  setGender(value: string, label: string) {
    this.form.get('gender')?.setValue(value);
    this.genderLabel.set(label);
    this.genderOpen.set(false);
  }

  toggleGender() {
    this.genderOpen.update((v) => !v);
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.register(this.form.value as any).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.errorMessage.set(
          err.error?.message || 'Đăng ký thất bại, thử lại!',
        );
        this.isLoading.set(false);
        setTimeout(() => shakeError('.hp-error-msg'), 50);
      },
    });
  }
}
