import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  email: string;
  role: string;
  customerId: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  currentUser = signal<string | null>(localStorage.getItem('email'));
  userRole = signal<string | null>(localStorage.getItem('role'));
  customerId = signal<string | null>(localStorage.getItem('customerId'));

  login(email: string, password: string): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap(res => {
        localStorage.setItem('accessToken', res.accessToken);
        localStorage.setItem('refreshToken', res.refreshToken);
        localStorage.setItem('email', res.email);
        localStorage.setItem('role', res.role);
        if (res.customerId) {
          localStorage.setItem('customerId', res.customerId);
          this.customerId.set(res.customerId);
        }
        this.currentUser.set(res.email);
        this.userRole.set(res.role);
      })
    );
  }

  register(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/customers/register`, payload);
  }

  logout(): void {
    localStorage.clear();
    this.currentUser.set(null);
    this.userRole.set(null);
    this.customerId.set(null);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  refreshToken(): Observable<AuthResponseDto> {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    return this.http.post<AuthResponseDto>(`${this.apiUrl}/auth/refresh`, { accessToken, refreshToken }).pipe(
      tap(res => {
        localStorage.setItem('accessToken', res.accessToken);
        localStorage.setItem('refreshToken', res.refreshToken);
      }),
      catchError(err => {
        this.logout();
        return throwError(() => err);
      })
    );
  }
}
