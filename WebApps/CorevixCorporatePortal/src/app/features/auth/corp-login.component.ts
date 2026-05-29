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
    <div class="glass-card p-8 rounded-2xl max-w-md w-full mx-auto shadow-xl transition-all duration-300">
      <div class="text-center mb-6">
        <h2 class="text-3xl font-extrabold tracking-tight text-primary">Corevix Ops</h2>
        <p class="text-sm opacity-70 mt-2">Sign in to the administrative and compliance operations panel</p>
      </div>

      @if (errorMessage()) {
        <div class="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs font-semibold mb-5 flex items-center gap-2">
          <span>⚠️</span> {{ errorMessage() }}
        </div>
      }

      <form (ngSubmit)="handleLogin()" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">Officer Email</label>
          <input
            type="email"
            name="email"
            [(ngModel)]="email"
            required
            class="w-full px-3 py-2 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-sm"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">Security Key (Password)</label>
          <input
            type="password"
            name="password"
            [(ngModel)]="password"
            required
            class="w-full px-3 py-2 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-sm"
          />
        </div>

        <button
          type="submit"
          [disabled]="isLoading()"
          class="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 text-sm"
        >
          {{ isLoading() ? 'Verifying Credentials...' : 'Authenticate' }}
        </button>
      </form>

      <div class="mt-6 text-center text-xs opacity-60">
        System access is logged and audited. Unauthorized access attempts will trigger compliance screening.
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
