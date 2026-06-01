import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-corp-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-12 min-h-screen w-full relative z-10">
      
      <!-- Left Panel: Real-time Compliance & Systems Telemetry -->
      <div class="hidden lg:flex lg:col-span-7 flex-col justify-between p-16 relative overflow-hidden bg-[#025864] text-white dark:bg-[#0c181a] border-r border-[#013f47] dark:border-border/10">
        
        <!-- Top branding -->
        <div class="flex items-center gap-3 animate-fade-in">
          <div class="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shadow-lg">
            <span class="text-white font-extrabold text-xl tracking-tighter">C</span>
          </div>
          <div>
            <h1 class="text-lg font-black tracking-wider text-white">COREVIX</h1>
            <p class="text-[10px] tracking-widest uppercase text-white/60">Operations & Risk</p>
          </div>
        </div>

        <!-- Center content: System summary and live telemetry -->
        <div class="max-w-xl my-auto py-12 space-y-8 animate-slide-up">
          <div class="space-y-4">
            <h2 class="text-4xl font-black tracking-tight leading-tight text-white">
              Institutional Compliance & <br />
              <span class="text-[#00D47E]">General Ledger Console</span>
            </h2>
            <p class="text-sm text-white/70 leading-relaxed">
              Access the administrative and operations command center. Monitor double-entry accounting integrity, authorize customer time deposits, approve loan programs, and run live transaction auditing.
            </p>
          </div>

          <!-- Telemetry Dashboard Mock -->
          <div class="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div class="absolute -right-12 -bottom-12 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>
            
            <div class="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
              <span class="text-xs font-bold uppercase tracking-wider text-white/90">
                Ledger Integrity Diagnostics
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white font-bold">REAL-TIME</span>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="p-3 bg-black/20 border border-white/5 rounded-2xl">
                <span class="text-[10px] font-bold text-white/50 uppercase tracking-wider block">GL Balance</span>
                <span class="text-sm font-black text-emerald-400 mt-1 block">Balanced (0.00)</span>
              </div>
              <div class="p-3 bg-black/20 border border-white/5 rounded-2xl">
                <span class="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Trial Balance</span>
                <span class="text-sm font-black text-white mt-1 block">₱0.00 Dev.</span>
              </div>
              <div class="p-3 bg-black/20 border border-white/5 rounded-2xl">
                <span class="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Sub-ledgers</span>
                <span class="text-sm font-black text-white mt-1 block">100% Match</span>
              </div>
              <div class="p-3 bg-black/20 border border-white/5 rounded-2xl">
                <span class="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Risk Rating</span>
                <span class="text-sm font-black text-emerald-400 mt-1 block">AAA (Minimal)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer terms -->
        <div class="text-xs text-white/40 border-t border-white/5 pt-6 flex justify-between items-center animate-fade-in">
          <span>Corevix Compliance Framework v4.2</span>
          <span>SEC / AMLA Compliant</span>
        </div>
      </div>

      <!-- Right Panel: Login Credentials Card -->
      <div class="col-span-12 lg:col-span-5 flex items-center justify-center p-6 md:p-12 bg-background">
        <div class="glass-card p-8 rounded-3xl w-full max-w-md shadow-2xl border border-border/15 space-y-6 relative overflow-hidden animate-fade-in">
          
          <div class="space-y-2">
            <h3 class="text-2xl font-black text-foreground">Authenticate Officer</h3>
            <p class="text-xs text-foreground/60">Enter your credentials to access audit tables and operations console.</p>
          </div>

          @if (errorMessage()) {
            <div class="alert alert-error">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <form (ngSubmit)="handleLogin()" class="space-y-4">
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-widest text-foreground/60 mb-2">Officer Email</label>
              <input
                type="email"
                name="email"
                [(ngModel)]="email"
                required
                placeholder="e.g. staff&#64;corevix.com"
                class="input"
              />
            </div>

            <div>
              <label class="block text-[10px] font-bold uppercase tracking-widest text-foreground/60 mb-2">Security Key (Password)</label>
              <input
                type="password"
                name="password"
                [(ngModel)]="password"
                required
                placeholder="••••••••"
                class="input"
              />
            </div>

            <button
              type="submit"
              [disabled]="isLoading()"
              class="btn btn-primary btn-block"
            >
              <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
              </svg>
              {{ isLoading() ? 'Verifying Identity...' : 'Access Operations' }}
            </button>
          </form>

          <div class="text-[10px] text-center text-foreground/45 border-t border-border/10 pt-4 leading-normal">
            ⚠️ Warning: Unauthorized access attempts are flagged, geolocated, and reported to the system administrator.
          </div>
        </div>
      </div>

    </div>
  `
})
export class CorpLoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  handleLogin() {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: err => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Corporate authentication failed.');
      }
    });
  }
}
