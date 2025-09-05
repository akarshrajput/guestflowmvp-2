import apiClient from './client';

export interface RegisterData {
  name: string;
  hotelName: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface OTPVerificationData {
  email: string;
  otp: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    hotelName: string;
  };
}

export interface OTPResponse {
  success: boolean;
  message: string;
  email: string;
  requiresOTP: boolean;
}

export const register = async (data: RegisterData): Promise<OTPResponse> => {
  const response = await apiClient.post<OTPResponse>('/auth/register', data);
  return response.data;
};

export const login = async (data: LoginData): Promise<OTPResponse> => {
  const response = await apiClient.post<OTPResponse>('/auth/login', data);
  return response.data;
};

export const verifyLoginOTP = async (data: OTPVerificationData): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/verify-login', data);
  return response.data;
};

export const verifyRegistrationOTP = async (data: OTPVerificationData): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/verify-registration', data);
  return response.data;
};

export const getCurrentUser = async (): Promise<AuthResponse['user']> => {
  const response = await apiClient.get<AuthResponse['user']>('/auth/me');
  return response.data;
};

export const logout = async (): Promise<void> => {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    localStorage.removeItem('token');
    window.location.href = '/auth/login';
  }
};

export const setAuthToken = (token: string) => {
  localStorage.setItem('token', token);
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('token');
};
