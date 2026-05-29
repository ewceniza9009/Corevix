import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { AccountService, AccountDetailsDto } from '../../core/services/account.service';

@Component({
  selector: 'app-qr-center',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="text-left mb-4">
        <h2 class="text-3xl font-extrabold text-white">QR Payments Hub</h2>
        <p class="text-sm text-foreground opacity-70">Scan or generate QR codes for instantaneous balance transfers</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Generate QR Code -->
        <div class="glass-card p-6 border border-border/40 rounded-2xl flex flex-col items-center justify-center text-center">
          <h3 class="text-lg font-bold text-white mb-4">My Account QR Code</h3>
          
          <div class="w-full mb-4">
            <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80 text-left">Select Account</label>
            <select
              [(ngModel)]="selectedAccountId"
              (change)="onAccountChange()"
              class="w-full px-3 py-2 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-sm"
            >
              @for (acc of accounts(); track acc.id) {
                <option [value]="acc.id">{{ acc.accountNumber }} - {{ acc.balance | currency:'PHP':'symbol' }}</option>
              }
            </select>
          </div>

          <div class="p-4 bg-white rounded-2xl shadow-inner mb-4 flex items-center justify-center w-52 h-52 relative">
            @if (qrCodeString()) {
              <!-- Display a mock QR pattern using a grid -->
              <div class="grid grid-cols-6 gap-1 w-40 h-40 opacity-90">
                @for (x of [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36]; track $index) {
                  <div [class]="(x % 2 === 0 || x % 3 === 0) ? 'bg-zinc-950' : 'bg-transparent'"></div>
                }
              </div>
            } @else {
              <div class="text-zinc-400 text-xs font-medium">Select an account to load QR</div>
            }
          </div>
          @if (qrCodeString()) {
            <span class="text-xs font-mono bg-background/50 px-3 py-1.5 border border-border/40 rounded-lg text-zinc-300 select-all">
              {{ qrCodeString() }}
            </span>
          }
        </div>

        <!-- Scan / Pay via QR -->
        <div class="glass-card p-6 border border-border/40 rounded-2xl space-y-4">
          <h3 class="text-lg font-bold text-white mb-2">Pay via QR Code</h3>
          <p class="text-xs opacity-75">Paste the QR code string payload to simulate scanning and transfer instantly.</p>

          @if (errorMessage()) {
            <div class="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs">
              ⚠️ {{ errorMessage() }}
            </div>
          }
          @if (successMessage()) {
            <div class="p-3 bg-primary/10 border border-primary/20 text-primary rounded-lg text-xs">
              🎉 {{ successMessage() }}
            </div>
          }

          <form (ngSubmit)="handleQrPay()" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">Select Source Account</label>
              <select
                [(ngModel)]="sourceAccountId"
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
              <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">QR Code Payload / String</label>
              <input
                type="text"
                name="qrPayload"
                [(ngModel)]="qrPayload"
                placeholder="e.g. CORE-ACC-1024582922"
                required
                class="w-full px-3 py-2 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">Amount to Transfer (₱)</label>
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
              [disabled]="isLoading() || !sourceAccountId || !qrPayload || amount <= 0"
              class="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition disabled:opacity-50 text-sm shadow-lg shadow-primary/20"
            >
              {{ isLoading() ? 'Processing Payment...' : 'Execute QR Payment' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  `
})
export class QrCenterComponent implements OnInit {
  private authService = inject(AuthService);
  private accountService = inject(AccountService);

  accounts = signal<AccountDetailsDto[]>([]);
  selectedAccountId = '';
  qrCodeString = signal<string | null>(null);

  sourceAccountId = '';
  qrPayload = '';
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
        this.selectedAccountId = accs[0].id;
        this.sourceAccountId = accs[0].id;
        this.onAccountChange();
      }
    });
  }

  onAccountChange() {
    const acc = this.accounts().find(a => a.id === this.selectedAccountId);
    if (acc) {
      this.qrCodeString.set(`CORE-ACC-${acc.accountNumber}`);
    }
  }

  handleQrPay() {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const match = this.qrPayload.match(/CORE-ACC-(\d+)/);
    if (!match) {
      this.isLoading.set(false);
      this.errorMessage.set('Invalid QR code format. Must follow template: CORE-ACC-XXXXXXXXXX');
      return;
    }

    const destinationAccountNumber = match[1];

    const payload = {
      destinationAccountNumber: destinationAccountNumber,
      amount: this.amount,
      description: `QR Payment to ${destinationAccountNumber}`,
      idempotencyKey: Math.random().toString(36).substring(2, 15)
    };

    this.accountService.transfer(this.sourceAccountId, payload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set(`Successfully paid ₱${this.amount.toFixed(2)} via QR.`);
        this.amount = 0;
        this.qrPayload = '';
        this.loadAccounts();
      },
      error: err => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'QR Payment execution failed.');
      }
    });
  }
}