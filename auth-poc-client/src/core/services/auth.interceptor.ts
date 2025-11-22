// auth.interceptor.ts
import { Injector, Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, from, ReplaySubject, throwError } from 'rxjs';
import { catchError, switchMap, finalize, take } from 'rxjs/operators';

import { AuthService } from './auth.service'; // still import the type for injector.get()
import { InMemoryAuthStore } from '../auth/auth.store';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private refreshInProgress = false;
  private refreshSubject = new ReplaySubject<string>(1);

  // URLs that should not be intercepted
  private excludedUrls = ['/login', '/refresh', '/logout'];

  constructor(
    private injector: Injector, // <- use Injector
    private store: InMemoryAuthStore
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip interceptor logic for auth endpoints
    if (this.shouldSkipInterceptor(req.url)) {
      console.log(`[Interceptor] Skipping: ${req.url}`);
      return next.handle(req);
    }

    console.log(`[Interceptor] Intercepting: ${req.url}`);
    const token = this.store.getAccessToken();
    const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` }}) : req;

    return next.handle(authReq).pipe(
      catchError(err => {
        if (err instanceof HttpErrorResponse && err.status === 401) {
          console.log(`[Interceptor] 401 detected on: ${req.url}`);
          return this.handle401(authReq, next);
        }
        return throwError(() => err);
      })
    );
  }

  private shouldSkipInterceptor(url: string): boolean {
    return this.excludedUrls.some(excludedUrl => url.includes(excludedUrl));
  }

  private handle401(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (this.refreshInProgress) {
      console.log('[Interceptor] Refresh already in progress, waiting...');
      return this.refreshSubject.pipe(
        take(1),
        switchMap(token => next.handle(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })))
      );
    }

    console.log('[Interceptor] Starting token refresh...');
    this.refreshInProgress = true;

    // Lazily get AuthService here (breaks DI cycle)
    const auth = this.injector.get<AuthService>(AuthService);

    return from(auth.performRefresh()).pipe(
      switchMap((newToken: string) => {
        console.log('[Interceptor] Token refresh successful');
        this.refreshSubject.next(newToken);
        return next.handle(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } }));
      }),
      catchError(err => {
        // Trigger session expired popup and clear tokens
        console.log('[Interceptor] Refresh token failed - triggering session expired');
        this.store.triggerSessionExpired();
        return throwError(() => err);
      }),
      finalize(() => {
        console.log('[Interceptor] Refresh process completed');
        this.refreshInProgress = false;
        this.refreshSubject = new ReplaySubject<string>(1);
      })
    );
  }
}
