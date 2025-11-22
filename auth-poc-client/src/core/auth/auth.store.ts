// in-memory-auth.store.ts
import { Injectable, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';

export interface TokenInfo {
  accessToken: string | null;
  accessExp?: number; // epoch seconds
}

@Injectable({ providedIn: 'root' })
export class InMemoryAuthStore {
  private tokenInfo = signal<TokenInfo>({ accessToken: null });
  
  // Subject to emit session expiry events
  sessionExpired$ = new Subject<void>();

  // Computed signals for reactive access
  accessToken = computed(() => this.tokenInfo().accessToken);
  accessExp = computed(() => this.tokenInfo().accessExp);

  // synchronous read (for backward compatibility)
  getAccessToken(): string | null {
    return this.tokenInfo().accessToken;
  }

  getAccessExp(): number | undefined {
    return this.tokenInfo().accessExp;
  }

  // Check if token is expired
  isTokenExpired(): boolean {
    const exp = this.getAccessExp();
    if (!exp) return true; // No expiry means expired
    const now = Math.floor(Date.now() / 1000);
    return exp <= now;
  }

  // synchronous write
  setAccessToken(token: string, exp?: number) {
    this.tokenInfo.set({ accessToken: token, accessExp: exp });
  }

  clear() {
    this.tokenInfo.set({ accessToken: null });
  }

  // Trigger session expired event
  triggerSessionExpired() {
    console.log('[AuthStore] Session expired triggered - clearing tokens and emitting event');
    this.clear();
    this.sessionExpired$.next();
  }
}
