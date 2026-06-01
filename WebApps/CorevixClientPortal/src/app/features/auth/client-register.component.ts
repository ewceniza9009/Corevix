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
    <div class="min-h-screen w-full flex items-center justify-center p-6 md:p-12 relative z-10">
      <div class="glass-card p-8 rounded-3xl max-w-xl w-full shadow-2xl border border-border/15 relative overflow-hidden animate-fade-in">
        
        <div class="text-center mb-6 space-y-1">
          <h2 class="text-2xl font-black text-foreground">Create Secure Vault</h2>
          <p class="text-xs text-foreground/60">Become a partner customer and open your secure ledger custody account.</p>
        </div>

        @if (errorMessage()) {
          <div class="alert alert-error mb-5">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        @if (successMessage()) {
          <div class="alert alert-success mb-5 flex flex-col items-start gap-3">
            <div class="flex items-center gap-2">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>{{ successMessage() }}</span>
            </div>
            <button (click)="goToLogin()" class="btn btn-primary btn-sm">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/>
              </svg>
              Proceed to Sign In
            </button>
          </div>
        } @else {
          <form (ngSubmit)="handleRegister()" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] font-bold uppercase tracking-widest text-foreground/60 mb-2">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  [(ngModel)]="firstName"
                  required
                  placeholder="John"
                  class="input"
                />
              </div>
              <div>
                <label class="block text-[10px] font-bold uppercase tracking-widest text-foreground/60 mb-2">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  [(ngModel)]="lastName"
                  required
                  placeholder="Doe"
                  class="input"
                />
              </div>
            </div>

            <div>
              <label class="block text-[10px] font-bold uppercase tracking-widest text-foreground/60 mb-2">Email Address</label>
              <input
                type="email"
                name="email"
                [(ngModel)]="email"
                required
                placeholder="e.g. john.doe&#64;example.com"
                class="input"
              />
            </div>

            <div>
              <label class="block text-[10px] font-bold uppercase tracking-widest text-foreground/60 mb-2">Phone Number</label>
              <input
                type="text"
                name="phoneNumber"
                [(ngModel)]="phoneNumber"
                required
                placeholder="e.g. +639171234567"
                class="input"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] font-bold uppercase tracking-widest text-foreground/60 mb-2">ID Type</label>
                <select
                  name="idType"
                  [(ngModel)]="idType"
                  required
                  class="input"
                >
                  <option value="Passport">Passport</option>
                  <option value="DriversLicense">Driver's License</option>
                  <option value="UMID">UMID</option>
                  <option value="SSS">SSS ID</option>
                  <option value="NationalID">National ID</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] font-bold uppercase tracking-widest text-foreground/60 mb-2">ID Number</label>
                <input
                  type="text"
                  name="idNumber"
                  [(ngModel)]="idNumber"
                  required
                  placeholder="ID Sequence Number"
                  class="input"
                />
              </div>
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
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z"/>
              </svg>
              {{ isLoading() ? 'Registering Account...' : 'Register Secure Account' }}
            </button>
          </form>
        }

        <div class="mt-6 text-center text-xs text-foreground/60 border-t border-border/10 pt-4">
          Already have a secure vault? 
          <a (click)="goToLogin()" class="text-primary font-bold hover:underline cursor-pointer">Sign In</a>
        </div>
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