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
    <div class="glass-card p-8 rounded-2xl max-w-md w-full mx-auto shadow-xl transition-all duration-300">
      <div class="text-center mb-6">
        <h2 class="text-3xl font-extrabold text-foreground">Corevix Client</h2>
        <p class="text-sm text-foreground/60 mt-1">Sign in to access your digital vault and accounts</p>
      </div>

      @if (errorMessage()) {
        <div class="alert alert-error mb-5">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          {{ errorMessage() }}
        </div>
      }

      <form (ngSubmit)="handleLogin()" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-foreground/60">Email Address</label>
          <input
            type="email"
            name="email"
            [(ngModel)]="email"
            required
            class="w-full h-10 px-3 border border-border rounded-xl bg-card text-foreground text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-foreground/60">Password</label>
          <input
            type="password"
            name="password"
            [(ngModel)]="password"
            required
            class="w-full h-10 px-3 border border-border rounded-xl bg-card text-foreground text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>

        <button
          type="submit"
          [disabled]="isLoading()"
          class="btn btn-primary btn-block"
        >
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/></svg>
          {{ isLoading() ? 'Signing In...' : 'Access Vault' }}
        </button>
      </form>

      <div class="mt-6 text-center text-xs text-foreground/50">
        Don't have an account? 
        <a (click)="goToRegister()" class="text-primary font-semibold hover:underline cursor-pointer">Register Now</a>
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
