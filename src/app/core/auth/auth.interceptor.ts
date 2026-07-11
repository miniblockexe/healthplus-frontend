import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.accessToken();

  const authReq = token
    ? req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`),
      })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Không retry nếu chính request refresh bị 401 — tránh infinite loop
      const isRefreshRequest = req.url.includes('/auth/refresh');
      if (error.status === 401 && !isRefreshRequest) {
        return authService.refreshToken().pipe(
          switchMap((res) => {
            const retryReq = req.clone({
              headers: req.headers.set(
                'Authorization',
                `Bearer ${res.data.accessToken}`,
              ),
            });
            return next(retryReq);
          }),
          catchError((refreshError) => {
            authService.logout();
            router.navigate(['/auth/login']);
            return throwError(() => refreshError);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
