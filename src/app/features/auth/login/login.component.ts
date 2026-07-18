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
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
  isLoading = signal(false);
  errorMessage = signal('');

  readonly googleAuthUrl = `${environment.apiUrl}/auth/google`;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  private isMobile = false;
  private viewportHandler: (() => void) | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private ngZone: NgZone,
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['error'] === 'google_failed') {
        this.errorMessage.set('Đăng nhập Google thất bại, vui lòng thử lại.');
      }
    });

    this.isMobile = window.innerWidth < 1024;
  }

  ngAfterViewInit() {
    if (!this.isMobile) return;

    // Chạy ngoài Angular zone để không trigger change detection liên tục
    this.ngZone.runOutsideAngular(() => {
      // Cách 1: scrollIntoView khi input được focus
      const inputs = document.querySelectorAll<HTMLElement>('input, select');
      inputs.forEach((input) => {
        input.addEventListener('focus', () => {
          setTimeout(() => {
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 350); // đợi bàn phím bật xong
        });
      });

      // Cách 2: visualViewport API (iOS Safari hỗ trợ tốt nhất)
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
    // Cleanup listener khi component bị destroy
    if (window.visualViewport && this.viewportHandler) {
      window.visualViewport.removeEventListener('resize', this.viewportHandler);
    }
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.login(this.form.value as any).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.errorMessage.set(
          err.error?.message || 'Đăng nhập thất bại, thử lại!',
        );
        this.isLoading.set(false);
      },
    });
  }
}
