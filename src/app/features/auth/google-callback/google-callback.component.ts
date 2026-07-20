import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-google-callback',
  standalone: true,
  imports: [],
  template: `
    <div
      class="min-h-screen bg-[var(--hp-bg)] flex items-center justify-center"
    >
      <div class="text-center">
        <div
          class="w-10 h-10 border-2 border-[var(--hp-purple)] border-t-transparent
                    rounded-full animate-spin mx-auto mb-3"
        ></div>
        <p class="text-sm text-[var(--hp-text2)]">Đang xử lý đăng nhập...</p>
      </div>
    </div>
  `,
})
export class GoogleCallbackComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    const queryError = this.route.snapshot.queryParamMap.get('error');
    if (queryError) {
      this.router.navigate(['/auth/login']);
      return;
    }

    const fragment = window.location.hash.slice(1);
    const params = new URLSearchParams(fragment);

    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const userRaw = params.get('user');

    if (!accessToken || !refreshToken || !userRaw) {
      this.router.navigate(['/auth/login'], {
        queryParams: { error: 'google_failed' },
      });
      return;
    }

    try {
      const user = JSON.parse(decodeURIComponent(userRaw));
      this.authService.handleGoogleCallback(accessToken, refreshToken, user);
      this.router.navigate(['/dashboard']);
    } catch {
      this.router.navigate(['/auth/login'], {
        queryParams: { error: 'google_failed' },
      });
    }
  }
}
