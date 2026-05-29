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
        <h2 class="text-3xl font-extrabold text-white">Bill Payments</h2>
        <p class="text-sm text-foreground opacity-70">Execute instant fee settlements for local utilities and telecommunications</p>
      </div>

      <div class="glass-card p-6 border border-border/40 rounded-2xl">
        <h3 class="text-lg font-bold text-white mb-4">Pay a Biller</h3>

        @if (errorMessage()) {
          <div class="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs mb-4">
            ⚠️ {{ errorMessage() }}
          </div>
        }

        @if (successMessage()) {
          <div class="p-3 bg-primary/10 border border-primary/20 text-primary rounded-lg text-xs mb-4">
            🎉 {{ successMessage() }}
          </div>
        }

        <form (ngSubmit)="handleBillPay()" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">Select Source Account</label>
            <select
              [(ngModel)]="accountId"
              name="sourceAccount"
              required
              class="w-full px-3 py-2 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-sm"
            >
              @for (acc of accounts(); track acc.id) {
                <option [value]="acc.id">{{ acc.accountNumber }} - {{ acc.balance | currency:'PHP':'symbol' }}</option>
              }
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">Select Utility Biller</label>
            <select
              name="biller"
              [(ngModel)]="billerCode"
              required
              class="w-full px-3 py-2 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-sm"
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
            <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">Account / Reference Number</label>
            <input
              type="text"
              name="referenceNumber"
              [(ngModel)]="referenceNumber"
              placeholder="e.g. 10-digit customer account number"
              required
              class="w-full px-3 py-2 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-sm"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">Payment Amount (₱)</label>
            <input
              type="number"
              name="amount"
              [(ngModel)]="amount"
              placeholder="0.00"
              required
              min="1"
              class="w-full px-3 py-2 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-sm"
            />
          </div>

          <button
            type="submit"
            [disabled]="isLoading() || !accountId || !billerCode || !referenceNumber || amount <= 0"
            class="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition disabled:opacity-50 text-sm shadow-lg shadow-primary/20"
          >
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