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
          <h2 class="text-3xl font-extrabold tracking-tight text-primary">Fund Transfer</h2>
          <p class="text-sm opacity-70 mt-1">Move money instantly between your accounts or to other Corevix users</p>
        </div>
      </div>

      @if (errorMessage()) {
        <div class="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs font-semibold flex items-center gap-2">
          <span>⚠️</span> {{ errorMessage() }}
        </div>
      }

      @if (successMessage()) {
        <div class="p-4 bg-primary/10 border border-primary/20 text-primary rounded-lg text-sm font-semibold text-center">
          🎉 {{ successMessage() }}
        </div>
      }

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Form Column -->
        <div class="md:col-span-2 space-y-6">
          <div class="glass-card p-6 border border-border/40 rounded-2xl">
            <form (ngSubmit)="handleTransfer()" class="space-y-6">
              <!-- Source Account -->
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider mb-2 opacity-80">Source Account</label>
                <select
                  name="sourceAccountId"
                  [(ngModel)]="sourceAccountId"
                  required
                  class="w-full px-3 py-2.5 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-sm"
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
                <label class="block text-xs font-semibold uppercase tracking-wider mb-2 opacity-80">Destination Type</label>
                <div class="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    (click)="transferType.set('internal')"
                    [class]="transferType() === 'internal' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background/30 opacity-70'"
                    class="py-3 border rounded-xl font-semibold text-sm transition text-center hover:opacity-100"
                  >
                    Between My Accounts
                  </button>
                  <button
                    type="button"
                    (click)="transferType.set('external')"
                    [class]="transferType() === 'external' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background/30 opacity-70'"
                    class="py-3 border rounded-xl font-semibold text-sm transition text-center hover:opacity-100"
                  >
                    To Another Account
                  </button>
                </div>
              </div>

              <!-- Destination Account -->
              @if (transferType() === 'internal') {
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider mb-2 opacity-80">Destination Account</label>
                  <select
                    name="destAccountId"
                    [(ngModel)]="destAccountId"
                    required
                    class="w-full px-3 py-2.5 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-sm"
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
                  <label class="block text-xs font-semibold uppercase tracking-wider mb-2 opacity-80">Destination Account Number</label>
                  <input
                    type="text"
                    name="destAccountNumber"
                    [(ngModel)]="destAccountNumber"
                    required
                    placeholder="Enter 12-digit Corevix account number"
                    class="w-full px-3 py-2.5 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-sm"
                  />
                </div>
              }

              <!-- Amount -->
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider mb-2 opacity-80">Amount (₱)</label>
                <input
                  type="number"
                  name="amount"
                  [(ngModel)]="amount"
                  required
                  min="1"
                  placeholder="0.00"
                  class="w-full px-3 py-2.5 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-sm"
                />
              </div>

              <!-- Description -->
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider mb-2 opacity-80">Description</label>
                <input
                  type="text"
                  name="description"
                  [(ngModel)]="description"
                  required
                  placeholder="Purpose of transfer"
                  class="w-full px-3 py-2.5 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-sm"
                />
              </div>

              <button
                type="submit"
                [disabled]="isLoading() || !sourceAccountId || (transferType() === 'internal' ? !destAccountId : !destAccountNumber) || amount <= 0"
                class="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 text-sm"
              >
                {{ isLoading() ? 'Processing Transfer...' : 'Execute Transfer' }}
              </button>
            </form>
          </div>
        </div>

        <!-- Details/Limits Sidebar -->
        <div class="space-y-6">
          <div class="glass-card p-6 border border-border/40 rounded-2xl">
            <h3 class="text-lg font-bold text-white mb-4">Transfer Guidelines</h3>
            <ul class="space-y-3 text-xs opacity-80">
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
