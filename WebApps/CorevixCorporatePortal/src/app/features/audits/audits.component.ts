import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AdminService, PendingKycCustomerDto, GlReconciliationReport } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-audits',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-8">
      <!-- Overview Header -->
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-3xl font-extrabold tracking-tight text-white">Compliance & Banking Operations</h2>
          <p class="text-sm opacity-70 mt-1">Maker-Checker authorizations, GL Reconciliation, OTC Teller Services, and Inter-branch audits.</p>
        </div>
        <div class="text-xs px-3 py-1.5 bg-zinc-800/80 text-zinc-300 border border-border/40 rounded-xl">
          Logged in as: <span class="font-bold text-primary">{{ authService.currentUser() }}</span> ({{ authService.userRole() }})
        </div>
      </div>

      <!-- Tab Selections -->
      <div class="flex flex-wrap border-b border-border/40 gap-1">
        <button
          (click)="activeTab = 'kyc'"
          [class.border-primary]="activeTab === 'kyc'"
          [class.text-primary]="activeTab === 'kyc'"
          class="px-5 py-3 border-b-2 border-transparent font-bold text-xs uppercase tracking-wider transition"
        >
          KYC Maker-Checker Queue
        </button>
        <button
          (click)="activeTab = 'otc'"
          [class.border-primary]="activeTab === 'otc'"
          [class.text-primary]="activeTab === 'otc'"
          class="px-5 py-3 border-b-2 border-transparent font-bold text-xs uppercase tracking-wider transition"
        >
          OTC Teller Services
        </button>
        <button
          (click)="activeTab = 'accounts'"
          [class.border-primary]="activeTab === 'accounts'"
          [class.text-primary]="activeTab === 'accounts'"
          class="px-5 py-3 border-b-2 border-transparent font-bold text-xs uppercase tracking-wider transition"
        >
          Account Console
        </button>
        <button
          (click)="activeTab = 'reconciliation'"
          [class.border-primary]="activeTab === 'reconciliation'"
          [class.text-primary]="activeTab === 'reconciliation'"
          class="px-5 py-3 border-b-2 border-transparent font-bold text-xs uppercase tracking-wider transition"
        >
          GL Reconciliation
        </button>
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

      <!-- TAB CONTENTS -->

      <!-- KYC Tab -->
      @if (activeTab === 'kyc') {
        <div class="glass-card p-6 border border-border/40 rounded-2xl space-y-4">
          <h3 class="text-lg font-bold text-white">Pending KYC Verification Queue</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-border/20 text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                  <th class="py-3 px-4">Customer Name</th>
                  <th class="py-3 px-4">Email</th>
                  <th class="py-3 px-4">ID Details</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="text-sm">
                @for (cust of pendingKyc(); track cust.id) {
                  <tr class="border-b border-border/10 hover:bg-background/20 transition">
                    <td class="py-3 px-4 text-white font-medium">
                      {{ cust.firstName }} {{ cust.lastName }}
                    </td>
                    <td class="py-3 px-4 text-zinc-300">{{ cust.email }}</td>
                    <td class="py-3 px-4 text-zinc-300">
                      {{ cust.idType }} - {{ cust.idNumber }}
                    </td>
                    <td class="py-3 px-4 text-right">
                      <button
                        (click)="approveKyc(cust.id)"
                        class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition"
                      >
                        Approve KYC
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4" class="py-6 text-center text-zinc-500">No customers pending KYC verification.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- OTC Teller Services Tab -->
      @if (activeTab === 'otc') {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="glass-card p-6 border border-border/40 rounded-2xl space-y-4">
            <h3 class="text-lg font-bold text-white">OTC Deposits & Withdrawals</h3>
            <form (ngSubmit)="handleOtcTransaction()" class="space-y-4">
              <div>
                <label class="block text-xs font-semibold uppercase mb-1.5">Target Account Number</label>
                <input
                  type="text"
                  name="otcAccNum"
                  [(ngModel)]="otcAccountNumber"
                  required
                  class="w-full px-3 py-2 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase mb-1.5">Transaction Type</label>
                <select
                  name="otcTxType"
                  [(ngModel)]="otcType"
                  class="w-full px-3 py-2 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                >
                  <option value="deposit">Deposit</option>
                  <option value="withdraw">Withdrawal</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase mb-1.5">Amount (₱)</label>
                <input
                  type="number"
                  name="otcTxAmount"
                  [(ngModel)]="otcAmount"
                  required
                  min="1"
                  class="w-full px-3 py-2 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>

              <button
                type="submit"
                class="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition text-sm shadow-lg shadow-primary/20"
              >
                Execute OTC Transaction
              </button>
            </form>
          </div>

          <div class="glass-card p-6 border border-border/40 rounded-2xl space-y-4">
            <h3 class="text-lg font-bold text-white">Teller Passbook / Statement Printer</h3>
            <p class="text-xs opacity-75">Retrieve transactions logs and print the official statement sheet for customers.</p>
            <div>
              <label class="block text-xs font-semibold uppercase mb-1.5">Account Number</label>
              <div class="flex gap-2">
                <input
                  type="text"
                  [(ngModel)]="otcPrintAccountNum"
                  class="w-full px-3 py-2 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
                <button
                  (click)="fetchOtcPassbook()"
                  class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-semibold transition"
                >
                  Load
                </button>
              </div>
            </div>

            @if (printLines().length > 0) {
              <div class="border border-border/20 rounded-xl p-4 bg-background/30 space-y-3">
                <div class="text-xs font-bold text-zinc-400">Passbook Lines Available for Print</div>
                <div class="max-h-40 overflow-y-auto space-y-1 font-mono text-xs text-zinc-300">
                  @for (l of printLines(); track l.sequence) {
                    <div>Seq: {{ l.sequence }} | {{ l.code }} | {{ l.debit ? '-' + l.debit : '+' + l.credit }} | Bal: {{ l.balance }}</div>
                  }
                </div>
                <button
                  (click)="printPassbookSheet()"
                  class="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Print Sheet
                </button>
              </div>
            }
          </div>
        </div>
      }

      <!-- Account Management Tab -->
      @if (activeTab === 'accounts') {
        <div class="glass-card p-6 border border-border/40 rounded-2xl space-y-4">
          <h3 class="text-lg font-bold text-white">Search & Manage Vault Accounts</h3>
          <div class="flex gap-2">
            <input
              type="text"
              placeholder="Search Customer Email or Account ID"
              [(ngModel)]="accountSearchQuery"
              class="w-full px-3 py-2 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
            <button
              (click)="searchAccounts()"
              class="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-semibold transition"
            >
              Search
            </button>
          </div>

          @if (searchedAccount()) {
            <div class="p-6 border border-border/20 rounded-2xl bg-background/30 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-3">
                <h4 class="font-bold text-white text-base">Account Configuration</h4>
                <div>
                  <span class="text-xs text-zinc-400">Account Number:</span>
                  <div class="text-sm font-mono text-white">{{ searchedAccount()?.accountNumber }}</div>
                </div>
                <div>
                  <span class="text-xs text-zinc-400">Current Balance:</span>
                  <div class="text-sm font-bold text-white">{{ searchedAccount()?.balance | currency:'PHP':'symbol' }}</div>
                </div>
                <div>
                  <span class="text-xs text-zinc-400">Status:</span>
                  <div class="text-sm font-bold text-white">{{ searchedAccount()?.status === 0 ? 'Active' : searchedAccount()?.status === 1 ? 'Frozen' : 'Closed' }}</div>
                </div>
                <div class="flex gap-2 pt-2">
                  <button
                    (click)="updateAccountStatus(0)"
                    class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition"
                  >
                    Activate
                  </button>
                  <button
                    (click)="updateAccountStatus(1)"
                    class="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-xs font-bold transition"
                  >
                    Freeze
                  </button>
                  <button
                    (click)="updateAccountStatus(2)"
                    class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div class="space-y-3">
                <h4 class="font-bold text-white text-base">Individual Limit Overrides</h4>
                <div>
                  <label class="block text-xs text-zinc-400 mb-1">Per-Transaction limit cap (₱)</label>
                  <input
                    type="number"
                    [(ngModel)]="overridePerTrans"
                    class="w-full px-3 py-1.5 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-xs"
                  />
                </div>
                <div>
                  <label class="block text-xs text-zinc-400 mb-1">Daily limit cap (₱)</label>
                  <input
                    type="number"
                    [(ngModel)]="overrideDaily"
                    class="w-full px-3 py-1.5 border border-border rounded-xl bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-xs"
                  />
                </div>
                <button
                  (click)="saveLimitOverrides()"
                  class="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover transition"
                >
                  Save Limit Configurations
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- GL Reconciliation Tab -->
      @if (activeTab === 'reconciliation') {
        <div class="glass-card p-6 border border-border/40 rounded-2xl space-y-6">
          <div class="flex justify-between items-center border-b border-border/10 pb-4">
            <div>
              <h3 class="text-lg font-bold text-white">General Ledger Real-time Auditing</h3>
              <p class="text-xs opacity-75">Compare active customer deposit totals against double-entry ledger liquidity entries.</p>
            </div>
            <button
              (click)="loadReconciliation()"
              class="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-bold transition"
            >
              Run Audit Reconciliation
            </button>
          </div>

          @if (reconReport()) {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div class="p-5 bg-background/30 border border-border/20 rounded-2xl">
                <span class="text-xs text-zinc-400 font-medium">Customer Deposits Total</span>
                <div class="text-xl font-extrabold text-white mt-1">
                  {{ reconReport()?.totalAccountBalances | currency:'PHP':'symbol' }}
                </div>
              </div>
              <div class="p-5 bg-background/30 border border-border/20 rounded-2xl">
                <span class="text-xs text-zinc-400 font-medium">Ledger Credit Balances</span>
                <div class="text-xl font-extrabold text-white mt-1">
                  {{ reconReport()?.totalLedgerCredits | currency:'PHP':'symbol' }}
                </div>
              </div>
              <div class="p-5 bg-background/30 border border-border/20 rounded-2xl">
                <span class="text-xs text-zinc-400 font-medium">Ledger Debit Balances</span>
                <div class="text-xl font-extrabold text-white mt-1">
                  {{ reconReport()?.totalLedgerDebits | currency:'PHP':'symbol' }}
                </div>
              </div>
              <div class="p-5 bg-background/30 border border-border/20 rounded-2xl">
                <span class="text-xs text-zinc-400 font-medium">Auditing Reconciliation</span>
                <div
                  [class]="reconReport()?.isReconciled ? 'text-emerald-500' : 'text-red-500'"
                  class="text-xl font-extrabold mt-1 uppercase"
                >
                  {{ reconReport()?.isReconciled ? 'Reconciled' : 'Discrepancy: ' + (reconReport()?.discrepancy | currency:'PHP':'symbol') }}
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class AuditsComponent implements OnInit {
  authService = inject(AuthService);
  adminService = inject(AdminService);
  private http = inject(HttpClient);

  activeTab = 'kyc';

  pendingKyc = signal<PendingKycCustomerDto[]>([]);
  reconReport = signal<GlReconciliationReport | null>(null);

  // OTC inputs
  otcAccountNumber = '';
  otcType = 'deposit';
  otcAmount = 0;
  otcPrintAccountNum = '';
  printLines = signal<any[]>([]);

  // Accounts Management search inputs
  accountSearchQuery = '';
  searchedAccount = signal<any | null>(null);
  overridePerTrans = 0;
  overrideDaily = 0;

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  ngOnInit() {
    this.loadKycQueue();
  }

  loadKycQueue() {
    this.adminService.getPendingKycCustomers().subscribe({
      next: (data) => this.pendingKyc.set(data),
      error: () => this.errorMessage.set('Failed to load pending KYC queue.')
    });
  }

  approveKyc(customerId: string) {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.adminService.approveKyc(customerId).subscribe({
      next: () => {
        this.successMessage.set('Customer KYC approved successfully.');
        this.loadKycQueue();
      },
      error: (err) => this.errorMessage.set(err.error?.error || 'KYC approval failed.')
    });
  }

  handleOtcTransaction() {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    // Resolve Account ID from Account Number by hitting /accounts/{num} or direct
    // For simplicity, Teller posts directly to backend endpoint.
    // In our backend endpoints: POST /accounts/{accountId}/deposit or /withdraw
    // Let's first search the account by number to get its ID, then execute!
    const searchUrl = `${this.authService['apiUrl']}/accounts/search?number=${this.otcAccountNumber}`;
    this.http.get<any>(searchUrl).subscribe({
      next: (acc) => {
        const url = `${this.authService['apiUrl']}/accounts/${acc.id}/${this.otcType}`;
        const payload = {
          accountId: acc.id,
          amount: this.otcAmount,
          description: `OTC ${this.otcType} by Teller`,
          idempotencyKey: Math.random().toString(36).substring(2, 15)
        };

        this.http.post(url, payload).subscribe({
          next: () => {
            this.successMessage.set(`OTC ${this.otcType} of ₱${this.otcAmount.toFixed(2)} completed successfully.`);
            this.otcAmount = 0;
            this.otcAccountNumber = '';
          },
          error: (err: any) => this.errorMessage.set(err.error?.error || 'OTC transaction failed.')
        });
      },
      error: () => this.errorMessage.set('Account number not found.')
    });
  }

  fetchOtcPassbook() {
    const searchUrl = `${this.authService['apiUrl']}/accounts/search?number=${this.otcPrintAccountNum}`;
    this.http.get<any>(searchUrl).subscribe({
      next: (acc) => {
        const passbookUrl = `${this.authService['apiUrl']}/accounts/${acc.id}/passbook`;
        this.http.get<any[]>(passbookUrl).subscribe({
          next: (lines) => this.printLines.set(lines)
        });
      },
      error: () => this.errorMessage.set('Account number not found.')
    });
  }

  printPassbookSheet() {
    window.print();
  }

  searchAccounts() {
    this.errorMessage.set(null);
    const searchUrl = `${this.authService['apiUrl']}/accounts/search?number=${this.accountSearchQuery}`;
    this.http.get<any>(searchUrl).subscribe({
      next: (acc) => {
        this.searchedAccount.set(acc);
        this.overridePerTrans = acc.limitOverridePerTransaction || 50000;
        this.overrideDaily = acc.limitOverrideDaily || 100000;
      },
      error: () => this.errorMessage.set('Account search failed.')
    });
  }

  updateAccountStatus(status: number) {
    const acc = this.searchedAccount();
    if (!acc) return;

    const url = `${this.authService['apiUrl']}/accounts/${acc.id}/status`;
    const payload = { status };

    this.http.post(url, payload).subscribe({
      next: () => {
        this.successMessage.set('Account status updated successfully.');
        this.searchAccounts();
      }
    });
  }

  saveLimitOverrides() {
    const acc = this.searchedAccount();
    if (!acc) return;

    const url = `${this.authService['apiUrl']}/accounts/${acc.id}/status`;
    const payload = {
      limitOverridePerTransaction: this.overridePerTrans,
      limitOverrideDaily: this.overrideDaily
    };

    this.http.post(url, payload).subscribe({
      next: () => {
        this.successMessage.set('Individual overrides saved successfully.');
        this.searchAccounts();
      }
    });
  }

  loadReconciliation() {
    this.adminService.getGlReconciliation().subscribe({
      next: (data) => this.reconReport.set(data)
    });
  }
}