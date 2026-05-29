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
        <h2 class="text-3xl font-extrabold text-foreground">Corevix Registration</h2>
        <p class="text-sm text-foreground/60 mt-1">Become a partner customer and open your secure vault</p>
      </div>

      @if (errorMessage()) {
        <div class="alert alert-error mb-5">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          {{ errorMessage() }}
        </div>
      }

      @if (successMessage()) {
        <div class="alert alert-success mb-5">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          {{ successMessage() }}
          <div class="mt-3 w-full">
            <button (click)="goToLogin()" class="btn btn-primary">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/></svg>
              Proceed to Sign In
            </button>
          </div>
        </div>
      } @else {
        <form (ngSubmit)="handleRegister()" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-foreground/60">First Name</label>
              <input
                type="text"
                name="firstName"
                [(ngModel)]="firstName"
                required
                class="w-full h-10 px-3 border border-border rounded-xl bg-card text-foreground text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-foreground/60">Last Name</label>
              <input
                type="text"
                name="lastName"
                [(ngModel)]="lastName"
                required
                class="w-full h-10 px-3 border border-border rounded-xl bg-card text-foreground text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
          </div>

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
            <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-foreground/60">Phone Number</label>
            <input
              type="text"
              name="phoneNumber"
              [(ngModel)]="phoneNumber"
              required
              placeholder="e.g. +639171234567"
              class="w-full h-10 px-3 border border-border rounded-xl bg-card text-foreground text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-foreground/60">ID Type</label>
              <select
                name="idType"
                [(ngModel)]="idType"
                required
                class="w-full h-10 px-3 border border-border rounded-xl bg-card text-foreground text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              >
                <option value="Passport">Passport</option>
                <option value="DriversLicense">Driver's License</option>
                <option value="UMID">UMID</option>
                <option value="SSS">SSS ID</option>
                <option value="NationalID">National ID</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-foreground/60">ID Number</label>
              <input
                type="text"
                name="idNumber"
                [(ngModel)]="idNumber"
                required
                class="w-full h-10 px-3 border border-border rounded-xl bg-card text-foreground text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
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
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z"/></svg>
            {{ isLoading() ? 'Submitting Registration...' : 'Register Secure Account' }}
          </button>
        </form>
      }

      <div class="mt-6 text-center text-xs text-foreground/50">
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