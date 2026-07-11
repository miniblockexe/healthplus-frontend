import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// Guard factory: chặn route theo role, dùng kèm authGuard ở route cha
// (authGuard đã đảm bảo đã đăng nhập trước khi guard này chạy).
// Trước đây /admin và /doctor chỉ ẩn ở sidebar (UI), không có guard
// thật ở route -> user thường gõ thẳng URL vẫn vào được trang.
export function roleGuard(allowedRoles: string[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const role = authService.currentUser()?.role;

    if (role && allowedRoles.includes(role)) {
      return true;
    }

    router.navigate(['/dashboard']);
    return false;
  };
}
