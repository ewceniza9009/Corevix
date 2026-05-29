import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { AccountService, AccountDetailsDto } from '../../core/services/account.service';

@Component({
  selector: 'app-bill-pay',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-2xl mx-auto space-y-6">
      <div class="text-left mb-4">
        <h2 class="text-3xl font-extrabold text-foreground">Bill Payments</h2>
        <p class="text-sm text-foreground/60 mt-1">Execute instant fee settlements for local utilities and telecommunications</p>
      </div>

      <div class="glass-card p-6 border border-border/40 rounded-2xl">
        <h3 class="text-lg font-bold text-foreground mb-4">Pay a Biller</h3>

        @if (errorMessage()) {
          <div class="alert alert-error mb-4">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            {{ errorMessage() }}
          </div>
        }

        @if (successMessage()) {
          <div class="alert alert-success mb-4">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {{ successMessage() }}
          </div>
        }

        <form (ngSubmit)="handleBillPay()" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-foreground/60">Select Source Account</label>
            <select
              [(ngModel)]="accountId"
              name="sourceAccount"
              required
              class="w-full h-10 px-3 border border-border rounded-xl bg-card text-foreground text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            >
              @for (acc of accounts(); track acc.id) {
                <option [value]="acc.id">{{ acc.accountNumber }} - {{ acc.balance | currency:'PHP':'symbol' }}</option>
              }
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-foreground/60">Select Utility Biller</label>
            <select
              name="biller"
              [(ngModel)]="billerCode"
              required
              class="w-full h-10 px-3 border border-border rounded-xl bg-card text-foreground text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            >
              <option value="MERALCO">Meralco (Electricity)</option>
              <option value="MAYNILAD">Maynilad Water Services</option>
              <option value="MANILAWATER">Manila Water Company</option>
              <option value="PLDT">PLDT Home (Broadband)</option>
              <option value="GLOBE">Globe Telecom (Mobile/Postpaid)</option>
              <option value="SMART">Smart Communications</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-foreground/60">Account / Reference Number</label>
            <input
              type="text"
              name="referenceNumber"
              [(ngModel)]="referenceNumber"
              placeholder="e.g. 10-digit customer account number"
              required
              class="w-full h-10 px-3 border border-border rounded-xl bg-card text-foreground text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-foreground/60">Payment Amount (₱)</label>
            <input
              type="number"
              name="amount"
              [(ngModel)]="amount"
              placeholder="0.00"
              required
              min="1"
              class="w-full h-10 px-3 border border-border rounded-xl bg-card text-foreground text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          <button
            type="submit"
            [disabled]="isLoading() || !accountId || !billerCode || !referenceNumber || amount <= 0"
            class="btn btn-primary btn-block"
          >
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {{ isLoading() ? 'Processing Payment...' : 'Confirm Bill Payment' }}
          </button>
        </form>
      </div>
    </div>
  `
})
export class BillPayComponent implements OnInit {
  private authService = inject(AuthService);
  private accountService = inject(AccountService);

  accounts = signal<AccountDetailsDto[]>([]);
  accountId = '';
  billerCode = 'MERALCO';
  referenceNumber = '';
  amount = 0;

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  ngOnInit() {
    this.loadAccounts();
  }

  loadAccounts() {
    const custId = this.authService.customerId();
    if (!custId) return;

    this.accountService.getAccounts(custId).subscribe(accs => {
      this.accounts.set(accs);
      if (accs.length > 0) {
        this.accountId = accs[0].id;
      }
    });
  }

  handleBillPay() {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload = {
      billerCode: this.billerCode,
      referenceNumber: this.referenceNumber,
      amount: this.amount
    };

    this.accountService.payBill(this.accountId, payload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set(`Successfully paid ₱${this.amount.toFixed(2)} to ${this.billerCode}.`);
        this.referenceNumber = '';
        this.amount = 0;
        this.loadAccounts();
      },
      error: err => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Bill payment execution failed.');
      }
    });
  }
}