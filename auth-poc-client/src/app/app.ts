import { Component, signal, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../core/services/auth.service';
import { InMemoryAuthStore } from '../core/auth/auth.store';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="max-width: 400px; margin: 40px auto; font-family: sans-serif;">
      
      <!-- SESSION EXPIRED POPUP -->
      <div *ngIf="showSessionExpiredPopup()" class="popup-overlay">
        <div class="popup">
          <h3>⚠️ Session Expired</h3>
          <p>Your session has expired. Please log in again.</p>
          <button (click)="closeSessionExpiredPopup()" class="btn">OK</button>
        </div>
      </div>
      
      <h2>🔐 Auth POC Tester</h2>

      <!-- LOGIN FORM -->
      <div *ngIf="!isLoggedIn()">
        <label>Username:</label>
        <input [(ngModel)]="username" class="input" />

        <label>Password:</label>
        <input [(ngModel)]="password" type="password" class="input" />

        <button (click)="login()" class="btn">Login</button>
      </div>

      <!-- LOGGED-IN PANEL -->
      <div *ngIf="isLoggedIn()" style="margin-top: 20px;">
        <p><b>Access Token:</b></p>
        <textarea readonly class="textarea">{{ accessToken }}</textarea>

        <p><b>Expires At:</b> {{ accessExpFormatted }} ({{ accessExp }})</p>

        <button (click)="callProtected()" class="btn">
          Call Protected API
        </button>

        <button (click)="logout()" class="btn red">
          Logout
        </button>
      </div>

      <hr />

      <!-- LOGS -->
      <h3>📜 Logs</h3>
      <textarea readonly class="log-area">{{ logs() }}</textarea>

    </div>
  `,
  styles: [`
    .input {
      width: 100%; padding: 8px; margin-bottom: 10px;
      border: 1px solid #ccc; border-radius: 4px;
    }
    .btn {
      margin-right: 10px; margin-top: 10px;
      padding: 8px 12px;
      border: none; border-radius: 4px;
      background: #1e88e5; color: white; cursor: pointer;
    }
    .btn.red { background: #c62828; }
    .textarea {
      width: 100%; height: 80px; font-size: 12px;
    }
    .log-area {
      width: 100%; height: 150px; font-size: 12px;
    }
    .popup-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); display: flex; align-items: center;
      justify-content: center; z-index: 1000;
    }
    .popup {
      background: white; padding: 24px; border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3); text-align: center;
      min-width: 300px;
    }
    .popup h3 { margin-top: 0; color: #d32f2f; }
    .popup p { margin: 16px 0; }
  `]
})
export class App implements OnDestroy {

  username = 'alice';
  password = 'password123';

  // Logs stored in signals
  logs = signal('');
  showSessionExpiredPopup = signal(false);
  
  private subscription = new Subscription();

  constructor(private auth: AuthService, private http: HttpClient, private store: InMemoryAuthStore)  {
    // Subscribe to session expired events
    console.log('[App] Setting up session expired subscription');
    this.subscription.add(
      this.store.sessionExpired$.subscribe(() => {
        console.log('[App] Session expired event received - showing popup');
        this.showSessionExpiredPopup.set(true);
        this.log('🚨 Session expired - please login again');
      })
    );

    // Attempt to refresh token on startup (optional)
    this.initializeAuth();
  }

  // Expose store signals as getters
  get accessToken() {
    return this.store.accessToken();
  }

  get accessExp() {
    return this.store.accessExp();
  }

  get accessExpFormatted() {
    const exp = this.store.accessExp();
    if (!exp) return 'N/A';
    return new Date(exp * 1000).toLocaleString();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private async initializeAuth() {
    try {
      // Attempt to refresh the token silently on app startup
      await this.auth.performRefresh();
      this.log('🔄 Token refreshed on startup');
    } catch (err) {
      // Silent failure - user will need to login manually
      console.log('No valid refresh token found');
    }
  }

  log(msg: string) {
    const time = new Date().toLocaleTimeString();
    this.logs.set(`[${time}] ${msg}\n` + this.logs());
  }

  isLoggedIn() {
    return !!this.store.getAccessToken();
  }

  async login() {
    try {
      await this.auth.login(this.username, this.password);
      this.log('✔ Login successful');
    } catch (err) {
      this.log('❌ Login failed');
    }
  }

  callProtected() {
    this.log('➡ Calling /protected…');

    this.http.get('http://localhost:4000/protected', {
      withCredentials: true
    }).subscribe({
      next: (res) => this.log('✔ Protected OK → ' + JSON.stringify(res)),
      error: (err) => this.log('❌ Protected error → ' + JSON.stringify(err.error))
    });
  }

  logout() {
    this.auth.logout();
    this.log('🚪 Logged out');
  }

  closeSessionExpiredPopup() {
    this.showSessionExpiredPopup.set(false);
  }
}
