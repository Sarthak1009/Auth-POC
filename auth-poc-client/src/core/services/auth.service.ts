// auth.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { InMemoryAuthStore } from '../auth/auth.store';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiBase = 'http://localhost:4000'; // backend
  store = inject(InMemoryAuthStore);

  constructor(private http: HttpClient) {}

  // Called after login; server will also set HttpOnly refresh cookie
  async login(username: string, password: string) {
    const res = await firstValueFrom(this.http.post<{ accessToken: string }>(
      `${this.apiBase}/login`, { username, password }, { withCredentials: true }
    ));
    this.setAccessTokenFromJwt(res.accessToken);
  }

  logout() {
    // clear memory and tell server to clear refresh cookie
    this.store.clear();
    // call server logout to remove refresh token server-side
    this.http.post(`${this.apiBase}/logout`, {}, { withCredentials: true }).subscribe();
  }

  // Call this to perform refresh; returns new access token or throws
  async performRefresh(): Promise<string> {
    // The refresh endpoint relies on HttpOnly cookie
    const res = await firstValueFrom(this.http.post<{ accessToken: string }>(
      `${this.apiBase}/refresh`, {}, { withCredentials: true }
    ));
    this.setAccessTokenFromJwt(res.accessToken);
    return res.accessToken;
  }

  // helper: decode JWT exp and store synchronously
  setAccessTokenFromJwt(token: string) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp; // epoch seconds
      this.store.setAccessToken(token, exp);
    } catch (e) {
      // store token without exp if decode fails
      this.store.setAccessToken(token);
    }
  }

  // optional: synchronous helper check
  isAccessExpiringSoon(thresholdSec = 30): boolean {
    const exp = this.store.getAccessExp();
    if (!exp) return false;
    const now = Math.floor(Date.now() / 1000);
    return exp - now < thresholdSec;
  }
}
