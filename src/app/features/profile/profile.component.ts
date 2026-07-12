import {
  Component,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { ApiResponse } from '../../core/models/api-response.model';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  readonly apiUrl = environment.apiUrl;

  isLoading = signal(false);
  isSaving = signal(false);
  isChangingPassword = signal(false);
  isUploadingAvatar = signal(false);
  avatarPreview = signal<string | null>(null);
  successMessage = signal('');
  errorMessage = signal('');
  activeTab = signal<'info' | 'password'>('info');

  // True nếu user đăng nhập bằng Google
  isGoogleUser = computed(
    () => this.authService.currentUser()?.authProvider === 'google',
  );

  // True nếu Google user đã từng đặt mật khẩu (backend trả về hasPassword)
  hasPassword = signal(false);

  // Dữ liệu cho 3 select ngày sinh
  days = Array.from({ length: 31 }, (_, i) => i + 1);
  months = [
    { value: 1, label: 'Tháng 1' },
    { value: 2, label: 'Tháng 2' },
    { value: 3, label: 'Tháng 3' },
    { value: 4, label: 'Tháng 4' },
    { value: 5, label: 'Tháng 5' },
    { value: 6, label: 'Tháng 6' },
    { value: 7, label: 'Tháng 7' },
    { value: 8, label: 'Tháng 8' },
    { value: 9, label: 'Tháng 9' },
    { value: 10, label: 'Tháng 10' },
    { value: 11, label: 'Tháng 11' },
    { value: 12, label: 'Tháng 12' },
  ];
  years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);

  profileForm = this.fb.group({
    fullname: ['', [Validators.required, Validators.minLength(2)]],
    phone: [''],
    gender: [''],
    dobDay: [''],
    dobMonth: [''],
    dobYear: [''],
  });

  passwordForm = this.fb.group({
    currentPassword: ['', [Validators.minLength(6)]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  });

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    public authService: AuthService,
  ) {}

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.isLoading.set(true);
    this.http.get<ApiResponse<any>>(`${this.apiUrl}/users/me`).subscribe({
      next: (res) => {
        const user = res.data;
        const dob = user.dateOfBirth ? new Date(user.dateOfBirth) : null;
        this.profileForm.patchValue({
          fullname: user.fullname,
          phone: user.phone || '',
          gender: user.gender || '',
          dobDay: dob ? String(dob.getDate()) : '',
          dobMonth: dob ? String(dob.getMonth() + 1) : '',
          dobYear: dob ? String(dob.getFullYear()) : '',
        });
        // Cập nhật signal hasPassword dựa trên backend response
        this.hasPassword.set(!!user.hasPassword);

        // Nếu là Google user đã có mật khẩu → currentPassword là required
        this.updatePasswordFormValidators();
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  /** Cập nhật validator của currentPassword tùy trạng thái user */
  private updatePasswordFormValidators() {
    const ctrl = this.passwordForm.get('currentPassword');
    if (!ctrl) return;

    const needsCurrent = !this.isGoogleUser() || this.hasPassword();
    if (needsCurrent) {
      ctrl.setValidators([Validators.required, Validators.minLength(6)]);
    } else {
      ctrl.clearValidators();
    }
    ctrl.updateValueAndValidity();
  }

  saveProfile() {
    if (this.profileForm.invalid) return;
    this.isSaving.set(true);
    this.errorMessage.set('');

    const val = this.profileForm.value;
    const body: any = { fullname: val.fullname };
    if (val.phone) body.phone = val.phone;
    if (val.gender) body.gender = val.gender;
    if (val.dobDay && val.dobMonth && val.dobYear) {
      const d = String(val.dobDay).padStart(2, '0');
      const m = String(val.dobMonth).padStart(2, '0');
      body.dateOfBirth = `${val.dobYear}-${m}-${d}`;
    }

    this.http
      .patch<ApiResponse<User>>(`${this.apiUrl}/users/profile`, body)
      .subscribe({
        next: (res) => {
          this.isSaving.set(false);
          this.showSuccess('Cập nhật thông tin thành công!');
        },
        error: (err) => {
          this.errorMessage.set(err.error?.message || 'Có lỗi xảy ra!');
          this.isSaving.set(false);
        },
      });
  }

  changePassword() {
    if (this.passwordForm.invalid) return;

    const val = this.passwordForm.value;
    if (val.newPassword !== val.confirmPassword) {
      this.errorMessage.set('Mật khẩu mới không khớp!');
      return;
    }

    this.isChangingPassword.set(true);
    this.errorMessage.set('');

    // Google user chưa có mật khẩu → không gửi currentPassword
    const isFirstTimeSet = this.isGoogleUser() && !this.hasPassword();
    const body: any = { newPassword: val.newPassword };
    if (!isFirstTimeSet) {
      body.currentPassword = val.currentPassword;
    }

    this.http
      .patch<ApiResponse<any>>(`${this.apiUrl}/users/change-password`, body)
      .subscribe({
        next: () => {
          this.isChangingPassword.set(false);
          this.passwordForm.reset();
          // Sau khi đặt mật khẩu thành công, cập nhật hasPassword
          if (isFirstTimeSet) this.hasPassword.set(true);
          const msg = isFirstTimeSet
            ? 'Đặt mật khẩu thành công!'
            : 'Đổi mật khẩu thành công!';
          this.showSuccess(msg);
          this.updatePasswordFormValidators();
        },
        error: (err) => {
          this.errorMessage.set(
            err.error?.message || 'Mật khẩu hiện tại không đúng!',
          );
          this.isChangingPassword.set(false);
        },
      });
  }

  onAvatarSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // Preview ngay lap tuc truoc khi upload
    const reader = new FileReader();
    reader.onload = (e) => this.avatarPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);

    this.uploadAvatar(file);
  }

  uploadAvatar(file: File) {
    this.isUploadingAvatar.set(true);
    this.errorMessage.set('');

    const formData = new FormData();
    formData.append('avatar', file);

    this.http.post<any>(`${this.apiUrl}/users/avatar`, formData).subscribe({
      next: (res) => {
        this.isUploadingAvatar.set(false);
        this.showSuccess('Cap nhat anh dai dien thanh cong!');
        // Cap nhat user trong AuthService de header hien thi anh moi
        if (res.data) this.authService.updateCurrentUser(res.data);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Upload that bai!');
        this.isUploadingAvatar.set(false);
        this.avatarPreview.set(null); // revert preview
      },
    });
  }

  private showSuccess(msg: string) {
    this.successMessage.set(msg);
    this.errorMessage.set('');
    setTimeout(() => this.successMessage.set(''), 3000);
  }
}
