import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  AfterViewInit,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { pageEnter } from '../../../shared/utils/page-transition';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent implements OnInit, AfterViewInit, OnDestroy {
  isLoading = signal(false);
  errorMessage = signal('');

  form = this.fb.group({
    fullname: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    gender: [''],
    phone: [''],
  });

  genderOpen = signal(false);
  genderLabel = signal('Chọn giới tính');

  private isMobile = false;
  private viewportHandler: (() => void) | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private ngZone: NgZone,
  ) {}

  setGender(value: string, label: string) {
    this.form.get('gender')?.setValue(value);
    this.genderLabel.set(label);
    this.genderOpen.set(false);
  }

  toggleGender() {
    this.genderOpen.set(!this.genderOpen());
  }

  ngOnInit() {
    this.isMobile = window.innerWidth < 1024;
  }

  ngAfterViewInit() {
    // Animate toàn bộ trang vào — GSAP thay cho animate-fade-in CSS
    pageEnter('.hp-auth-page');

    if (!this.isMobile) return;

    this.ngZone.runOutsideAngular(() => {
      // scrollIntoView khi focus vào input/select
      const inputs = document.querySelectorAll<HTMLElement>('input, select');
      inputs.forEach((input) => {
        input.addEventListener('focus', () => {
          setTimeout(() => {
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 350);
        });
      });

      // visualViewport API cho iOS Safari
      if (window.visualViewport) {
        this.viewportHandler = () => {
          const active = document.activeElement as HTMLElement;
          if (
            active &&
            (active.tagName === 'INPUT' || active.tagName === 'SELECT')
          ) {
            setTimeout(() => {
              active.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
          }
        };
        window.visualViewport.addEventListener('resize', this.viewportHandler);
      }
    });
  }

  ngOnDestroy() {
    if (window.visualViewport && this.viewportHandler) {
      window.visualViewport.removeEventListener('resize', this.viewportHandler);
    }
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.register(this.form.value as any).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.errorMessage.set(
          err.error?.message || 'Đăng ký thất bại, thử lại!',
        );
        this.isLoading.set(false);
      },
    });
  }
}
