import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  let authReq = req;
  const isPublicRoute = req.url.includes('/auth/login') || req.url.includes('/auth/refresh') || req.url.includes('/customers/register');
  
  if (token && !isPublicRoute) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        if (req.url.includes('/auth/login') || req.url.includes('/auth/refresh')) {
          return throwError(() => error);
        }

        return authService.refreshToken().pipe(
          switchMap((response) => {
            const retryReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${response.accessToken}`
              }
            });
            return next(retryReq);
          }),
          catchError((refreshErr) => {
            if (refreshErr.status === 401 || refreshErr.status === 400) {
              authService.logout();
            }
            return throwError(() => refreshErr);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
