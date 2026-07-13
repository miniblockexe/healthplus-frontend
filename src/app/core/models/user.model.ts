export interface User {
  id: number;
  fullname: string;
  email: string;
  role: 'user' | 'doctor' | 'admin';
  authProvider?: 'local' | 'google'; // 'google' nếu đăng nhập bằng Google
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  specialty?: string;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullname: string;
  email: string;
  password: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
}
