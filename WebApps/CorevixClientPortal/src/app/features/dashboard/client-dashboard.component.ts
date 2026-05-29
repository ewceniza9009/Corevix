import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { AccountService, AccountDetailsDto, TransactionDto } from '../../core/services/account.service';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-8">
      <!-- Top Overview Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 class="text-3xl font-extrabold tracking-tight text-white">Financial Dashboard</h2>
          <p class="text-sm opacity-70 mt-1">Hello, {{ authService.currentUser() }}. Welcome back to your secure vault.</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <button (click)="showOpenAccountModal.set(true)" class="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-primary/20">
            + Open New Account
          </button>
          <button (click)="showGcashModal.set(true)" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-blue-500/20">
            📱 GCash Cash-In
          </button>
          <button (click)="loadDashboard()" class="px-4 py-2 border border-border/40 hover:bg-background/40 text-sm font-medium rounded-xl transition">
            Refresh
          </button>
        </div>
      </div>

      <!-- Error / Success Banners -->
      @if (errorMessage()) {
        <div class="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs">
          ⚠️ {{ errorMessage() }}
        </div>
      }
      @if (successMessage()) {
        <div class="p-3 bg-primary/10 border border-primary/20 text-primary rounded-xl text-xs">
          🎉 {{ successMessage() }}
        </div>
      }

      <!-- Accounts Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        @for (acc of accounts(); track acc.id) {
          <div
            (click)="selectAccount(acc)"
            [class.ring-2]="selectedAccount()?.id === acc.id"
            [class.ring-primary]="selectedAccount()?.id === acc.id"
            class="glass-card p-6 border border-border/40 rounded-2xl cursor-pointer hover:-translate-y-1 transition duration-300"
          >
            <div class="flex justify-between items-start">
              <span class="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {{ getAccountTypeName(acc.accountType) }}
              </span>
              <span
                [class]="acc.status === 0 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'"
                class="text-[10px] px-2 py-0.5 border rounded-full font-bold uppercase tracking-wider"
              >
                {{ acc.status === 0 ? 'Active' : acc.status === 1 ? 'Frozen' : 'Closed' }}
              </span>
            </div>
            <div class="text-2xl font-extrabold text-white mt-4">
              {{ acc.balance | currency:'PHP':'symbol' }}
            </div>
            <div class="text-[11px] font-mono text-zinc-400 mt-2">
              No: {{ acc.accountNumber }}
            </div>
          </div>
        } @empty {
          <div class="col-span-full glass-card p-8 text-center text-zinc-400">
            No accounts found. Open a new savings account to get started.
          </div>
        }
      </div>

      <!-- Main Layout Columns -->
      @if (selectedAccount()) {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Left Columns (Insights + Passbook + Settings) -->
          <div class="lg:col-span-2 space-y-8">
            <!-- Simulated Cash-In / ATM Cash-Out -->
            <div class="glass-card p-6 border border-border/40 rounded-2xl space-y-4">
              <h3 class="text-lg font-bold text-white">Simulate Transactions (ATM / Cashier)</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Cash In -->
                <div class="space-y-3">
                  <span class="text-xs font-bold uppercase tracking-wider text-zinc-400">Cash Deposit</span>
                  <div class="flex gap-2">
                    <input
                      type="number"
                      placeholder="0.00"
                      [(ngModel)]="simDepositAmount"
                      class="w-full px-3 py-2 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-sm"
                    />
                    <button
                      (click)="simulateDeposit()"
                      class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition"
                    >
                      Deposit
                    </button>
                  </div>
                </div>
                <!-- Cash Out -->
                <div class="space-y-3">
                  <span class="text-xs font-bold uppercase tracking-wider text-zinc-400">ATM Withdrawal</span>
                  <div class="flex gap-2">
                    <input
                      type="number"
                      placeholder="0.00"
                      [(ngModel)]="simWithdrawAmount"
                      class="w-full px-3 py-2 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-sm"
                    />
                    <button
                      (click)="simulateWithdrawal()"
                      class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition"
                    >
                      Withdraw
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Spending Insights -->
            <div class="glass-card p-6 border border-border/40 rounded-2xl">
              <h3 class="text-lg font-bold text-white mb-4">Spending Insights</h3>
              <div class="grid grid-cols-3 gap-4 text-center">
                <div class="p-4 bg-background/30 rounded-xl border border-border/20">
                  <span class="text-xs text-zinc-400">Total Deposits</span>
                  <div class="text-lg font-extrabold text-emerald-500 mt-1">
                    {{ totalDeposits() | currency:'PHP':'symbol' }}
                  </div>
                </div>
                <div class="p-4 bg-background/30 rounded-xl border border-border/20">
                  <span class="text-xs text-zinc-400">Total Withdrawals</span>
                  <div class="text-lg font-extrabold text-red-500 mt-1">
                    {{ totalWithdrawals() | currency:'PHP':'symbol' }}
                  </div>
                </div>
                <div class="p-4 bg-background/30 rounded-xl border border-border/20">
                  <span class="text-xs text-zinc-400">Total Bill Payments</span>
                  <div class="text-lg font-extrabold text-primary mt-1">
                    {{ totalBills() | currency:'PHP':'symbol' }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Digital Passbook / Statement -->
            <div class="glass-card p-6 border border-border/40 rounded-2xl">
              <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-bold text-white">Digital Passbook</h3>
                <button
                  (click)="printStatement()"
                  class="px-3 py-1.5 border border-border/40 hover:bg-background/40 text-xs font-semibold rounded-lg text-zinc-300 transition flex items-center gap-1.5"
                >
                  🖨️ Print Statement
                </button>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="border-b border-border/20 text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                      <th class="py-3 px-4">Date</th>
                      <th class="py-3 px-4">Description</th>
                      <th class="py-3 px-4 text-right">Debit</th>
                      <th class="py-3 px-4 text-right">Credit</th>
                      <th class="py-3 px-4 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody class="text-sm">
                    @for (line of passbookLines(); track line.sequence) {
                      <tr class="border-b border-border/10 hover:bg-background/20 transition">
                        <td class="py-3 px-4 text-xs font-mono opacity-80">
                          {{ line.date | date:'yyyy-MM-dd HH:mm' }}
                        </td>
                        <td class="py-3 px-4 font-medium text-white">{{ line.description }}</td>
                        <td class="py-3 px-4 text-right text-red-500 font-semibold">
                          {{ line.debit ? '-' + (line.debit | currency:'PHP':'symbol') : '' }}
                        </td>
                        <td class="py-3 px-4 text-right text-emerald-500 font-semibold">
                          {{ line.credit ? '+' + (line.credit | currency:'PHP':'symbol') : '' }}
                        </td>
                        <td class="py-3 px-4 text-right font-mono text-zinc-300 font-semibold">
                          {{ line.balance | currency:'PHP':'symbol' }}
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="5" class="py-6 text-center text-zinc-500">No passbook statements recorded.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Right Column: Settings Tabs -->
          <div class="space-y-8">
            <!-- Card limits, apply loan, open Time Deposit -->
            <div class="glass-card p-6 border border-border/40 rounded-2xl space-y-6">
              <h3 class="text-lg font-bold text-white mb-2">Debit Card Management</h3>
              <div class="flex justify-between items-center py-2 border-b border-border/10">
                <span class="text-sm font-medium">Card Locked Status</span>
                <button
                  (click)="toggleCardLock()"
                  [class]="selectedAccount()?.isCardLocked ? 'bg-red-600' : 'bg-primary'"
                  class="px-3 py-1 text-xs text-white rounded-lg font-bold transition"
                >
                  {{ selectedAccount()?.isCardLocked ? 'Unlock Card' : 'Lock Card' }}
                </button>
              </div>

              <div class="space-y-3">
                <span class="text-xs font-bold uppercase tracking-wider text-zinc-400">Card Limits Adjustment</span>
                <div>
                  <label class="block text-[11px] text-zinc-400 mb-1">Per-transaction POS limit</label>
                  <input
                    type="number"
                    [(ngModel)]="cardPerTransLimit"
                    class="w-full px-3 py-1.5 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-xs"
                  />
                </div>
                <div>
                  <label class="block text-[11px] text-zinc-400 mb-1">Daily Limit</label>
                  <input
                    type="number"
                    [(ngModel)]="cardDailyLimit"
                    class="w-full px-3 py-1.5 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-xs"
                  />
                </div>
                <button
                  (click)="updateCardLimits()"
                  class="w-full py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary-hover transition"
                >
                  Save Limit Configuration
                </button>
              </div>
            </div>

            <!-- Apply for Loan / Invest in Time Deposit -->
            <div class="glass-card p-6 border border-border/40 rounded-2xl space-y-6">
              <h3 class="text-lg font-bold text-white">Loans & Time Deposits</h3>
              
              <!-- Open TD -->
              <div class="space-y-3 border-b border-border/10 pb-4">
                <span class="text-xs font-bold uppercase tracking-wider text-zinc-400">Invest in Time Deposit</span>
                <div>
                  <input
                    type="number"
                    placeholder="Principal Amount (₱)"
                    [(ngModel)]="tdAmount"
                    class="w-full px-3 py-1.5 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-xs mb-2"
                  />
                  <select
                    [(ngModel)]="tdTerm"
                    class="w-full px-3 py-1.5 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-xs"
                  >
                    <option [value]="90">90 Days Term (4.50% APY)</option>
                    <option [value]="180">180 Days Term (4.75% APY)</option>
                    <option [value]="360">360 Days Term (5.00% APY)</option>
                  </select>
                </div>
                <button
                  (click)="openTimeDeposit()"
                  class="w-full py-2 bg-primary text-xs font-semibold rounded-xl hover:bg-primary-hover transition"
                >
                  Open Time Deposit
                </button>
              </div>

              <!-- Apply Loan -->
              <div class="space-y-3">
                <span class="text-xs font-bold uppercase tracking-wider text-zinc-400">Apply for a New Loan</span>
                <div>
                  <input
                    type="number"
                    placeholder="Principal Amount (₱)"
                    [(ngModel)]="loanAmount"
                    class="w-full px-3 py-1.5 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-xs mb-2"
                  />
                  <select
                    [(ngModel)]="loanTerm"
                    class="w-full px-3 py-1.5 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-xs"
                  >
                    <option [value]="12">12 Months Term (6.00% p.a.)</option>
                    <option [value]="24">24 Months Term (6.50% p.a.)</option>
                    <option [value]="36">36 Months Term (7.00% p.a.)</option>
                  </select>
                </div>
                <button
                  (click)="applyLoan()"
                  class="w-full py-2 bg-primary text-xs font-semibold rounded-xl hover:bg-primary-hover transition"
                >
                  Apply for Loan
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- MODALS -->

      <!-- Open Account Modal -->
      @if (showOpenAccountModal()) {
        <div class="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div class="glass-card max-w-md w-full p-6 border border-border/40 rounded-2xl space-y-4">
            <h3 class="text-lg font-bold text-white">Open New Vault Account</h3>
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-semibold uppercase mb-1">Account Type</label>
                <select
                  [(ngModel)]="newAccountType"
                  class="w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option [value]="0">Savings Account</option>
                  <option [value]="1">Checking Account</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase mb-1">Branch Selection</label>
                <select
                  [(ngModel)]="newAccountBranch"
                  class="w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="0001">Makati (Head Branch)</option>
                  <option value="0002">Cebu Branch</option>
                  <option value="0003">Manila Branch</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase mb-1">Initial Deposit (₱)</label>
                <input
                  type="number"
                  [(ngModel)]="newAccountDeposit"
                  class="w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <button (click)="showOpenAccountModal.set(false)" class="px-4 py-2 border border-border/40 rounded-xl text-sm font-medium transition hover:bg-background/40">
                Cancel
              </button>
              <button (click)="openNewAccount()" class="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-bold transition">
                Create Account
              </button>
            </div>
          </div>
        </div>
      }

      <!-- GCash Top-Up Checkout flow (PayMongo Mock) -->
      @if (showGcashModal()) {
        <div class="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div class="glass-card max-w-md w-full p-6 border border-border/40 rounded-2xl space-y-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-extrabold text-lg">G</div>
              <div>
                <h3 class="text-lg font-bold text-white">GCash Instant Cash-In</h3>
                <p class="text-xs text-zinc-400">Mock PayMongo Secure Gateway</p>
              </div>
            </div>

            <div class="space-y-4 py-2">
              <div>
                <label class="block text-xs font-semibold uppercase mb-1">GCash Registered Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. 09171234567"
                  [(ngModel)]="gcashPhone"
                  class="w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase mb-1">Cash-In Amount (₱)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  [(ngModel)]="gcashAmount"
                  class="w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <button (click)="showGcashModal.set(false)" class="px-4 py-2 border border-border/40 rounded-xl text-sm font-medium transition hover:bg-background/40">
                Cancel
              </button>
              <button (click)="executeGcashCashIn()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition">
                Confirm GCash Top-Up
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class ClientDashboardComponent implements OnInit {
  authService = inject(AuthService);
  accountService = inject(AccountService);

  accounts = signal<AccountDetailsDto[]>([]);
  selectedAccount = signal<AccountDetailsDto | null>(null);
  passbookLines = signal<any[]>([]);

  // Simulation amounts
  simDepositAmount = 0;
  simWithdrawAmount = 0;

  // Limits input
  cardPerTransLimit = 0;
  cardDailyLimit = 0;

  // New account inputs
  showOpenAccountModal = signal(false);
  newAccountType = 0;
  newAccountBranch = '0001';
  newAccountDeposit = 1000;

  // GCash inputs
  showGcashModal = signal(false);
  gcashPhone = '';
  gcashAmount = 0;

  // Loans/TD inputs
  tdAmount = 0;
  tdTerm = 90;
  loanAmount = 0;
  loanTerm = 12;

  // Spending insights totals
  totalDeposits = signal(0);
  totalWithdrawals = signal(0);
  totalBills = signal(0);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    const custId = this.authService.customerId();
    if (!custId) return;

    this.accountService.getAccounts(custId).subscribe({
      next: (accs) => {
        this.accounts.set(accs);
        if (accs.length > 0) {
          // Keep current selection or default to first
          const current = this.selectedAccount();
          const match = accs.find(a => a.id === current?.id);
          this.selectAccount(match || accs[0]);
        }
      },
      error: () => {
        this.errorMessage.set('Failed to load accounts.');
      }
    });
  }

  selectAccount(account: AccountDetailsDto) {
    this.selectedAccount.set(account);
    this.simDepositAmount = 0;
    this.simWithdrawAmount = 0;
    this.cardPerTransLimit = 50000; // default overrides or fetch from model if available
    this.cardDailyLimit = 100000;

    // Load passbook lines
    this.accountService.getPassbook(account.id).subscribe({
      next: (lines) => {
        this.passbookLines.set(lines);
        this.calculateInsights(lines);
      }
    });
  }

  calculateInsights(lines: any[]) {
    let dep = 0;
    let wth = 0;
    let bil = 0;

    lines.forEach(l => {
      if (l.code === 'DEP') dep += l.credit || 0;
      else if (l.code === 'WTH') wth += l.debit || 0;
      else if (l.code === 'BIL') bil += l.debit || 0;
    });

    this.totalDeposits.set(dep);
    this.totalWithdrawals.set(wth);
    this.totalBills.set(bil);
  }

  getAccountTypeName(type: number): string {
    switch (type) {
      case 0: return 'Savings Account';
      case 1: return 'Checking Account';
      case 2: return 'Time Deposit';
      case 3: return 'Loan Account';
      default: return 'Deposit Account';
    }
  }

  simulateDeposit() {
    const acc = this.selectedAccount();
    if (!acc || this.simDepositAmount <= 0) return;

    const payload = {
      accountId: acc.id,
      amount: this.simDepositAmount,
      description: 'Simulated Cashier Deposit',
      idempotencyKey: Math.random().toString(36).substring(2, 15)
    };

    // We can directly post to deposit simulated endpoint on backend or execute command
    // Deposit is mapped as /accounts/{id}/deposit or transfer. Let's send to /accounts/{accountId}/deposit if mapped, or use transfer API.
    // In our backend map: MapPost("/accounts/{accountId}/deposit")
    // Wait, let's write it in AccountService or hit HTTP directly! Let's do it via http post directly or we can add it to AccountService.
    // Since it's a simulated cash in cashier panel, let's do a post to /accounts/{accountId}/deposit!
    const clientHttp = inject(AuthService)['http']; // private helper or we inject HttpClient, but AuthService already has http
    // Actually, we can inject HttpClient directly in component or hit API URL
    // In this file, let's do a direct call or use our services
    // Since AccountService does not have simulateDeposit yet, let's post it!
    // But wait! We can just use the standard endpoint `/accounts/{accountId}/deposit` on backend which we mapped in TransactionEndpoints.cs!
    const url = `${this.authService['apiUrl']}/accounts/${acc.id}/deposit`;
    clientHttp.post(url, payload).subscribe({
      next: () => {
        this.successMessage.set(`Successfully deposited ₱${this.simDepositAmount.toFixed(2)}.`);
        this.simDepositAmount = 0;
        this.loadDashboard();
      },
      error: (err: any) => this.errorMessage.set(err.error?.error || 'Deposit failed.')
    });
  }

  simulateWithdrawal() {
    const acc = this.selectedAccount();
    if (!acc || this.simWithdrawAmount <= 0) return;

    const payload = {
      accountId: acc.id,
      amount: this.simWithdrawAmount,
      description: 'Simulated ATM Cash Withdrawal',
      idempotencyKey: Math.random().toString(36).substring(2, 15)
    };

    const clientHttp = inject(AuthService)['http'];
    const url = `${this.authService['apiUrl']}/accounts/${acc.id}/withdraw`;
    clientHttp.post(url, payload).subscribe({
      next: () => {
        this.successMessage.set(`Successfully withdrew ₱${this.simWithdrawAmount.toFixed(2)}.`);
        this.simWithdrawAmount = 0;
        this.loadDashboard();
      },
      error: (err: any) => this.errorMessage.set(err.error?.error || 'Withdrawal failed.')
    });
  }

  toggleCardLock() {
    const acc = this.selectedAccount();
    if (!acc) return;

    this.accountService.toggleCardLock(acc.id).subscribe({
      next: (res) => {
        this.successMessage.set(res.isCardLocked ? 'Card locked successfully.' : 'Card unlocked successfully.');
        this.loadDashboard();
      }
    });
  }

  updateCardLimits() {
    const acc = this.selectedAccount();
    if (!acc) return;

    const payload = {
      perTransactionLimit: this.cardPerTransLimit,
      dailyLimit: this.cardDailyLimit
    };

    this.accountService.updateCardLimits(acc.id, payload).subscribe({
      next: () => {
        this.successMessage.set('Card limits updated successfully.');
        this.loadDashboard();
      }
    });
  }

  openTimeDeposit() {
    const acc = this.selectedAccount();
    if (!acc || this.tdAmount <= 0) return;

    const payload = {
      amount: this.tdAmount,
      termDays: this.tdTerm
    };

    this.accountService.openTimeDeposit(acc.id, payload).subscribe({
      next: () => {
        this.successMessage.set(`Opened Time Deposit of ₱${this.tdAmount.toFixed(2)} successfully.`);
        this.tdAmount = 0;
        this.loadDashboard();
      },
      error: (err) => this.errorMessage.set(err.error?.error || 'Failed to open Time Deposit.')
    });
  }

  applyLoan() {
    const acc = this.selectedAccount();
    if (!acc || this.loanAmount <= 0) return;

    const payload = {
      customerId: this.authService.customerId(),
      principalAmount: this.loanAmount,
      termMonths: this.loanTerm,
      disbursalAccountId: acc.id
    };

    this.accountService.applyLoan(payload).subscribe({
      next: () => {
        this.successMessage.set(`Loan application for ₱${this.loanAmount.toFixed(2)} submitted successfully (Pending Approval).`);
        this.loanAmount = 0;
        this.loadDashboard();
      },
      error: (err) => this.errorMessage.set(err.error?.error || 'Failed to apply for loan.')
    });
  }

  openNewAccount() {
    const custId = this.authService.customerId();
    if (!custId) return;

    const payload = {
      customerId: custId,
      accountType: Number(this.newAccountType),
      initialDepositAmount: this.newAccountDeposit,
      currency: 'PHP',
      idempotencyKey: Math.random().toString(36).substring(2, 15),
      branchCode: this.newAccountBranch
    };

    this.accountService.openAccount(payload).subscribe({
      next: () => {
        this.successMessage.set('Account opened successfully.');
        this.showOpenAccountModal.set(false);
        this.loadDashboard();
      },
      error: (err) => this.errorMessage.set(err.error?.error || 'Failed to open account.')
    });
  }

  executeGcashCashIn() {
    const acc = this.selectedAccount();
    if (!acc || this.gcashAmount <= 0 || !this.gcashPhone) return;

    // Simulate PayMongo signature Webhook /api/webhooks/paymongo direct post or deposit
    // For simplicity, GCash cash-in is simulated as a Deposit transaction
    const payload = {
      accountId: acc.id,
      amount: this.gcashAmount,
      description: `GCash Cash-In via PayMongo (${this.gcashPhone})`,
      idempotencyKey: Math.random().toString(36).substring(2, 15)
    };

    const clientHttp = inject(AuthService)['http'];
    const url = `${this.authService['apiUrl']}/accounts/${acc.id}/deposit`;
    clientHttp.post(url, payload).subscribe({
      next: () => {
        this.successMessage.set(`Successfully cashed in ₱${this.gcashAmount.toFixed(2)} from GCash.`);
        this.showGcashModal.set(false);
        this.gcashAmount = 0;
        this.gcashPhone = '';
        this.loadDashboard();
      },
      error: (err: any) => this.errorMessage.set(err.error?.error || 'GCash Cash-In failed.')
    });
  }

  printStatement() {
    window.print();
  }
}