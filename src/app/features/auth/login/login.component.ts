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
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { environment } from '../../../../environments/environment';
import {
  authEnter,
  heartbeatPulse,
  shakeError,
} from '../../../shared/utils/page-transition';

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
  }

  ngAfterViewInit() {
    // Auth panels + form fields stagger
    authEnter();

    // Heartbeat icon trên logo brand — nhịp đập nhẹ
    heartbeatPulse('.hp-heartbeat-icon');

    // Fix iOS Safari: khi bàn phím pop lên, scroll input vào view
    if (window.innerWidth < 1024) {
      this.ngZone.runOutsideAngular(() => {
        const inputs = document.querySelectorAll<HTMLElement>('input');
        inputs.forEach((input) => {
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

  onSubmit() {
    if (this.form.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.login(this.form.value as any).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.errorMessage.set(
          err.error?.message || 'Đăng nhập thất bại, thử lại!',
        );
        this.isLoading.set(false);
        // shakeError sau 1 tick để Angular render banner trước
        setTimeout(() => shakeError('.hp-error-msg'), 50);
      },
    });
  }
}
