import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountService, AccountDetailsDto } from '../../core/services/account.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-transfers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-8 max-w-4xl mx-auto">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-3xl font-extrabold text-foreground">Fund Transfer</h2>
          <p class="text-sm text-foreground/60 mt-1">Move money instantly between your accounts or to other Corevix users</p>
        </div>
      </div>

      @if (errorMessage()) {
        <div class="alert alert-error">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          {{ errorMessage() }}
        </div>
      }

      @if (successMessage()) {
        <div class="alert alert-success">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          {{ successMessage() }}
        </div>
      }

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Form Column -->
        <div class="md:col-span-2 space-y-6">
          <div class="glass-card p-6 border border-border/40 rounded-2xl">
            <form (ngSubmit)="handleTransfer()" class="space-y-6">
              <!-- Source Account -->
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-foreground/60">Source Account</label>
                <select
                  name="sourceAccountId"
                  [(ngModel)]="sourceAccountId"
                  required
                  class="w-full h-10 px-3 border border-border rounded-xl bg-card text-foreground text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                >
                  <option value="" disabled>Select an account</option>
                  @for (acc of accounts(); track acc.id) {
                    <option [value]="acc.id">
                      {{ getAccountTypeName(acc.accountType) }} - {{ acc.accountNumber }} (₱{{ acc.balance.toFixed(2) }})
                    </option>
                  }
                </select>
              </div>

              <!-- Transfer Type -->
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-foreground/60">Destination Type</label>
                <div class="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    (click)="transferType.set('internal')"
                    [class]="transferType() === 'internal' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background/30 text-foreground/60'"
                    class="btn btn-block justify-center"
                  >
                    <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/></svg>
                    Between My Accounts
                  </button>
                  <button
                    type="button"
                    (click)="transferType.set('external')"
                    [class]="transferType() === 'external' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background/30 text-foreground/60'"
                    class="btn btn-block justify-center"
                  >
                    <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
                    To Another Account
                  </button>
                </div>
              </div>

              <!-- Destination Account -->
              @if (transferType() === 'internal') {
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-foreground/60">Destination Account</label>
                  <select
                    name="destAccountId"
                    [(ngModel)]="destAccountId"
                    required
                    class="w-full h-10 px-3 border border-border rounded-xl bg-card text-foreground text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  >
                    <option value="" disabled>Select target account</option>
                    @for (acc of accounts(); track acc.id) {
                      @if (acc.id !== sourceAccountId) {
                        <option [value]="acc.id">
                          {{ getAccountTypeName(acc.accountType) }} - {{ acc.accountNumber }} (₱{{ acc.balance.toFixed(2) }})
                        </option>
                      }
                    }
                  </select>
                </div>
              } @else {
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-foreground/60">Destination Account Number</label>
                  <input
                    type="text"
                    name="destAccountNumber"
                    [(ngModel)]="destAccountNumber"
                    required
                    placeholder="Enter 12-digit Corevix account number"
                    class="w-full h-10 px-3 border border-border rounded-xl bg-card text-foreground text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
              }

              <!-- Amount -->
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-foreground/60">Amount (₱)</label>
                <input
                  type="number"
                  name="amount"
                  [(ngModel)]="amount"
                  required
                  min="1"
                  placeholder="0.00"
                  class="w-full h-10 px-3 border border-border rounded-xl bg-card text-foreground text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              <!-- Description -->
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-foreground/60">Description</label>
                <input
                  type="text"
                  name="description"
                  [(ngModel)]="description"
                  required
                  placeholder="Purpose of transfer"
                  class="w-full h-10 px-3 border border-border rounded-xl bg-card text-foreground text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              <button
                type="submit"
                [disabled]="isLoading() || !sourceAccountId || (transferType() === 'internal' ? !destAccountId : !destAccountNumber) || amount <= 0"
                class="btn btn-primary btn-block"
              >
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/></svg>
                {{ isLoading() ? 'Processing Transfer...' : 'Execute Transfer' }}
              </button>
            </form>
          </div>
        </div>

        <!-- Details/Limits Sidebar -->
        <div class="space-y-6">
          <div class="glass-card p-6 border border-border/40 rounded-2xl">
            <h3 class="text-lg font-bold text-foreground mb-4">Transfer Guidelines</h3>
            <ul class="space-y-3 text-xs text-foreground/60">
              <li>• Instapay / PESONet transfers are processed instantly for internal routing.</li>
              <li>• Per-transaction limit for standard accounts is ₱50,000.00.</li>
              <li>• Daily cumulative limits apply based on KYC verification levels.</li>
              <li>• Please ensure correct destination account details before confirming.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TransfersComponent implements OnInit {
  private accountService = inject(AccountService);
  private authService = inject(AuthService);

  accounts = signal<AccountDetailsDto[]>([]);
  sourceAccountId = '';
  transferType = signal<'internal' | 'external'>('internal');
  destAccountId = '';
  destAccountNumber = '';
  amount = 0;
  description = '';

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  ngOnInit() {
    this.loadAccounts();
  }

  loadAccounts() {
    const custId = this.authService.customerId();
    if (!custId) return;
    this.accountService.getAccounts(custId).subscribe({
      next: (accs) => this.accounts.set(accs),
      error: () => this.errorMessage.set('Failed to load accounts for transfer.')
    });
  }

  getAccountTypeName(type: number): string {
    switch (type) {
      case 0: return 'Savings';
      case 1: return 'Checking';
      case 2: return 'Time Deposit';
      default: return 'Account';
    }
  }

  handleTransfer() {
    if (!this.sourceAccountId || this.amount <= 0) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload = {
      destinationAccountNumber: this.transferType() === 'internal'
        ? this.accounts().find(a => a.id === this.destAccountId)?.accountNumber
        : this.destAccountNumber,
      amount: this.amount,
      description: this.description,
      idempotencyKey: Math.random().toString(36).substring(2, 15)
    };

    if (!payload.destinationAccountNumber) {
      this.isLoading.set(false);
      this.errorMessage.set('Invalid destination account.');
      return;
    }

    this.accountService.transfer(this.sourceAccountId, payload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set(`Successfully transferred ₱${this.amount.toFixed(2)}.`);
        this.amount = 0;
        this.description = '';
        this.destAccountNumber = '';
        this.destAccountId = '';
        this.loadAccounts();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Transfer failed.');
      }
    });
  }
}
