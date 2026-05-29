import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-client-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="glass-card p-8 rounded-2xl max-w-lg w-full mx-auto shadow-xl transition-all duration-300">
      <div class="text-center mb-6">
        <h2 class="text-3xl font-extrabold tracking-tight text-primary">Corevix Registration</h2>
        <p class="text-sm opacity-70 mt-2">Become a partner customer and open your secure vault</p>
      </div>

      @if (errorMessage()) {
        <div class="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs font-semibold mb-5 flex items-center gap-2">
          <span>⚠️</span> {{ errorMessage() }}
        </div>
      }

      @if (successMessage()) {
        <div class="p-4 bg-primary/10 border border-primary/20 text-primary rounded-lg text-sm font-semibold mb-5 text-center">
          🎉 {{ successMessage() }}
          <div class="mt-3">
            <button (click)="goToLogin()" class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover text-xs font-bold transition">
              Proceed to Sign In
            </button>
          </div>
        </div>
      } @else {
        <form (ngSubmit)="handleRegister()" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">First Name</label>
              <input
                type="text"
                name="firstName"
                [(ngModel)]="firstName"
                required
                class="w-full px-3 py-2 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-sm"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">Last Name</label>
              <input
                type="text"
                name="lastName"
                [(ngModel)]="lastName"
                required
                class="w-full px-3 py-2 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-sm"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">Email Address</label>
            <input
              type="email"
              name="email"
              [(ngModel)]="email"
              required
              class="w-full px-3 py-2 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-sm"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">Phone Number</label>
            <input
              type="text"
              name="phoneNumber"
              [(ngModel)]="phoneNumber"
              required
              placeholder="e.g. +639171234567"
              class="w-full px-3 py-2 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-sm"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">ID Type</label>
              <select
                name="idType"
                [(ngModel)]="idType"
                required
                class="w-full px-3 py-2 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-sm"
              >
                <option value="Passport">Passport</option>
                <option value="DriversLicense">Driver's License</option>
                <option value="UMID">UMID</option>
                <option value="SSS">SSS ID</option>
                <option value="NationalID">National ID</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">ID Number</label>
              <input
                type="text"
                name="idNumber"
                [(ngModel)]="idNumber"
                required
                class="w-full px-3 py-2 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-sm"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">Password</label>
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
            {{ isLoading() ? 'Submitting Registration...' : 'Register Secure Account' }}
          </button>
        </form>
      }

      <div class="mt-6 text-center text-xs opacity-75">
        Already have an account? 
        <a (click)="goToLogin()" class="text-primary font-semibold hover:underline cursor-pointer">Sign In</a>
      </div>
    </div>
  `
})
export class ClientRegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  firstName = '';
  lastName = '';
  email = '';
  phoneNumber = '';
  idType = 'Passport';
  idNumber = '';
  password = '';

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  handleRegister() {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const payload = {
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      phoneNumber: this.phoneNumber,
      idType: this.idType,
      idNumber: this.idNumber,
      idImageUri: 'https://example.com/mock-id.jpg',
      selfieImageUri: 'https://example.com/mock-selfie.jpg',
      password: this.password
    };

    this.authService.register(payload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('Registration submitted successfully! Your account is pending KYC Maker-Checker approval.');
      },
      error: err => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Registration failed.');
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }
}