import { Component, OnInit, signal } from '@angular/core';
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
export class LoginComponent implements OnInit {
  isLoading = signal(false);
  errorMessage = signal('');

  // URL redirect sang backend Google OAuth
  readonly googleAuthUrl = `${environment.apiUrl}/auth/google`;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    // Hiển thị lỗi nếu Google callback trả về ?error=google_failed
    this.route.queryParams.subscribe((params) => {
      if (params['error'] === 'google_failed') {
        this.errorMessage.set('Đăng nhập Google thất bại, vui lòng thử lại.');
      }
    });
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