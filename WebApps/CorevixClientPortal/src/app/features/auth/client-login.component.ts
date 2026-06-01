import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-client-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-12 min-h-screen w-full relative z-10">
      
      <!-- Left Panel: Client Vault Benefits & Wealth Dashboard -->
      <div class="hidden lg:flex lg:col-span-7 flex-col justify-between p-16 relative overflow-hidden bg-[#025864] text-white dark:bg-[#0c181a] border-r border-[#013f47] dark:border-border/10">
        
        <!-- Top branding -->
        <div class="flex items-center gap-3 animate-fade-in">
          <div class="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shadow-lg">
            <span class="text-white font-extrabold text-xl tracking-tighter">C</span>
          </div>
          <div>
            <h1 class="text-lg font-black tracking-wider text-white">COREVIX</h1>
            <p class="text-[10px] tracking-widest uppercase text-white/60">Personal Vault & Wealth</p>
          </div>
        </div>

        <!-- Center content: Benefits overview -->
        <div class="max-w-xl my-auto py-12 space-y-8 animate-slide-up">
          <div class="space-y-4">
            <h2 class="text-4xl font-black tracking-tight leading-tight text-white">
              Secure Vault Access & <br />
              <span class="text-[#00D47E]">Digital Wealth Custody</span>
            </h2>
            <p class="text-sm text-white/70 leading-relaxed">
              Welcome to your digital financial portal. Access interest-bearing accounts, high-yield time deposits, instant transfers, bill payments, and smart loans.
            </p>
          </div>

          <!-- Feature Cards Grid -->
          <div class="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div class="absolute -right-12 -bottom-12 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>
            
            <div class="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
              <span class="text-xs font-bold uppercase tracking-wider text-white/90">
                Vault Protection & Yield Benefits
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-400 font-bold">ACTIVE</span>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="p-4 bg-black/20 border border-white/5 rounded-2xl flex gap-3 items-start">
                <div class="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0"></div>
                <div>
                  <h4 class="text-xs font-bold text-white">High-Yield Interest</h4>
                  <p class="text-[10px] text-white/60 mt-1">Earn up to 5.00% APY on automated time deposits and dynamic savings plans.</p>
                </div>
              </div>
              
              <div class="p-4 bg-black/20 border border-white/5 rounded-2xl flex gap-3 items-start">
                <div class="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0"></div>
                <div>
                  <h4 class="text-xs font-bold text-white">Full Audit Trail</h4>
                  <p class="text-[10px] text-white/60 mt-1">Every transaction settles instantly across our real-time double-entry general ledger.</p>
                </div>
              </div>

              <div class="p-4 bg-black/20 border border-white/5 rounded-2xl flex gap-3 items-start">
                <div class="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0"></div>
                <div>
                  <h4 class="text-xs font-bold text-white">Instant Settlement</h4>
                  <p class="text-[10px] text-white/60 mt-1">Send and receive funds instantly with high-fidelity QR codes and bank transfers.</p>
                </div>
              </div>

              <div class="p-4 bg-black/20 border border-white/5 rounded-2xl flex gap-3 items-start">
                <div class="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0"></div>
                <div>
                  <h4 class="text-xs font-bold text-white">Access Smart Credit</h4>
                  <p class="text-[10px] text-white/60 mt-1">Apply for institutional-backed capital programs directly with rapid approval workflows.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer terms -->
        <div class="text-xs text-white/40 border-t border-white/5 pt-6 flex justify-between items-center animate-fade-in">
          <span>Corevix Custody Platform v4.2</span>
          <span>PDIC Member • Max Deposit Insurance Coverage Applied</span>
        </div>
      </div>

      <!-- Right Panel: Login Credentials Card -->
      <div class="col-span-12 lg:col-span-5 flex items-center justify-center p-6 md:p-12 bg-background">
        <div class="glass-card p-8 rounded-3xl w-full max-w-md shadow-2xl border border-border/15 space-y-6 relative overflow-hidden animate-fade-in">
          
          <div class="space-y-2">
            <h3 class="text-2xl font-black text-foreground">Access Vault</h3>
            <p class="text-xs text-foreground/60">Sign in to manage your digital vault and savings portfolios.</p>
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
              <label class="block text-[10px] font-bold uppercase tracking-widest text-foreground/60 mb-2">Email Address</label>
              <input
                type="email"
                name="email"
                [(ngModel)]="email"
                required
                placeholder="e.g. customer&#64;corevix.com"
                class="input"
              />
            </div>

            <div>
              <label class="block text-[10px] font-bold uppercase tracking-widest text-foreground/60 mb-2">Password</label>
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
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/>
              </svg>
              {{ isLoading() ? 'Securing Session...' : 'Access Digital Vault' }}
            </button>
          </form>

          <div class="mt-6 text-center text-xs text-foreground/60 border-t border-border/10 pt-4">
            Don't have a secure vault? 
            <a (click)="goToRegister()" class="text-primary font-bold hover:underline cursor-pointer">Register Now</a>
          </div>
        </div>
      </div>

    </div>
  `
})
export class ClientLoginComponent {
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
        this.errorMessage.set(err.error?.error || 'Authentication failed.');
      }
    });
  }

  goToRegister() {
    this.router.navigate(['/auth/register']);
  }
}
