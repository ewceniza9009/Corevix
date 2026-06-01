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
    <div class="space-y-8 animate-fade-in text-foreground">
      <!-- Overview Header -->
      <div class="flex justify-between items-center pb-6 border-b border-border/10">
        <div>
          <h2 class="text-4xl font-black tracking-tight bg-gradient-to-r from-primary to-[#00d47e] bg-clip-text text-transparent">Compliance & Operations</h2>
          <p class="text-sm text-foreground/70 mt-2">Maker-Checker authorizations, GL Reconciliation, OTC Teller Services, and Inter-branch audits.</p>
        </div>
        <div class="text-xs px-3 py-1.5 glass-panel text-foreground/80 border border-border/10 rounded-xl">
          Logged in as: <span class="font-bold text-primary dark:text-[#00d47e]">{{ authService.currentUser() }}</span> ({{ authService.userRole() }})
        </div>
      </div>

      <!-- Tab Selections -->
      <div class="flex flex-wrap gap-2 pb-2">
        <button
          (click)="activeTab = 'kyc'"
          [class]="activeTab === 'kyc' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'"
        >
          KYC Maker-Checker Queue
        </button>
        <button
          (click)="activeTab = 'otc'"
          [class]="activeTab === 'otc' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'"
        >
          OTC Teller Services
        </button>
        <button
          (click)="activeTab = 'accounts'"
          [class]="activeTab === 'accounts' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'"
        >
          Account Console
        </button>
        <button
          (click)="activeTab = 'reconciliation'"
          [class]="activeTab === 'reconciliation' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'"
        >
          GL Reconciliation
        </button>
      </div>

      <!-- Error / Success Banners -->
      @if (errorMessage()) {
        <div class="alert alert-error">
          <span>⚠️</span> {{ errorMessage() }}
        </div>
      }
      @if (successMessage()) {
        <div class="alert alert-success">
          <span>🎉</span> {{ successMessage() }}
        </div>
      }

      <!-- TAB CONTENTS -->

      <!-- KYC Tab -->
      @if (activeTab === 'kyc') {
        <div class="glass-card p-6 rounded-3xl space-y-4">
          <h3 class="text-lg font-bold text-foreground">Pending KYC Verification Queue</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-border/20 text-xs text-zinc-500 font-bold uppercase tracking-wider">
                  <th class="py-3 px-4">Customer Name</th>
                  <th class="py-3 px-4">Email</th>
                  <th class="py-3 px-4">ID Details</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="text-sm">
                @for (cust of pendingKyc(); track cust.id) {
                  <tr class="border-b border-border/10 hover:bg-background/20 transition">
                    <td class="py-3 px-4 text-foreground font-medium">
                      {{ cust.firstName }} {{ cust.lastName }}
                    </td>
                    <td class="py-3 px-4 text-foreground/70">{{ cust.email }}</td>
                    <td class="py-3 px-4 text-foreground/70">
                      {{ cust.idType }} - {{ cust.idNumber }}
                    </td>
                    <td class="py-3 px-4 text-right">
                      <button
                        (click)="approveKyc(cust.id)"
                        class="btn btn-accent btn-sm"
                      >
                        Approve KYC
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4" class="py-6 text-center text-zinc-500 font-bold">No customers pending KYC verification.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- OTC Teller Services Tab -->
      @if (activeTab === 'otc') {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up">
          <div class="glass-card p-6 rounded-3xl space-y-4">
            <h3 class="text-lg font-bold text-foreground">OTC Deposits & Withdrawals</h3>
            <form (ngSubmit)="handleOtcTransaction()" class="space-y-4">
              <div>
                <label class="block text-xs font-bold uppercase mb-1.5 text-zinc-500">Target Account Number</label>
                <input
                  type="text"
                  name="otcAccNum"
                  [(ngModel)]="otcAccountNumber"
                  required
                  class="input"
                />
              </div>

              <div>
                <label class="block text-xs font-bold uppercase mb-1.5 text-zinc-500">Transaction Type</label>
                <select
                  name="otcTxType"
                  [(ngModel)]="otcType"
                  class="input"
                >
                  <option value="deposit">Deposit</option>
                  <option value="withdraw">Withdrawal</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold uppercase mb-1.5 text-zinc-500">Amount (₱)</label>
                <input
                  type="number"
                  name="otcTxAmount"
                  [(ngModel)]="otcAmount"
                  required
                  min="1"
                  class="input"
                />
              </div>

              <button
                type="submit"
                class="btn btn-primary btn-block"
              >
                Execute OTC Transaction
              </button>
            </form>
          </div>

          <div class="glass-card p-6 rounded-3xl space-y-4">
            <h3 class="text-lg font-bold text-foreground">Teller Passbook / Statement Printer</h3>
            <p class="text-xs text-foreground/70">Retrieve transactions logs and print the official statement sheet for customers.</p>
            <div class="space-y-2">
              <label class="block text-xs font-bold uppercase text-zinc-500">Account Number</label>
              <div class="flex gap-2">
                <input
                  type="text"
                  [(ngModel)]="otcPrintAccountNum"
                  class="input"
                />
                <button
                  (click)="fetchOtcPassbook()"
                  class="btn btn-secondary"
                >
                  Load
                </button>
              </div>
            </div>

            @if (printLines().length > 0) {
              <div class="border border-border/20 rounded-2xl p-4 bg-background/30 space-y-3">
                <div class="text-xs font-bold text-zinc-500">Passbook Lines Available for Print</div>
                <div class="max-h-40 overflow-y-auto space-y-1 font-mono text-xs text-foreground/80">
                  @for (l of printLines(); track l.sequence) {
                    <div>Seq: {{ l.sequence }} | {{ l.code }} | {{ l.debit ? '-' + l.debit : '+' + l.credit }} | Bal: {{ l.balance }}</div>
                  }
                </div>
                <button
                  (click)="printPassbookSheet()"
                  class="btn btn-accent btn-block"
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
        <div class="glass-card p-6 rounded-3xl space-y-4 animate-slide-up">
          <h3 class="text-lg font-bold text-foreground">Search & Manage Vault Accounts</h3>
          <div class="flex gap-2">
            <input
              type="text"
              placeholder="Search Customer Email or Account ID"
              [(ngModel)]="accountSearchQuery"
              class="input"
            />
            <button
              (click)="searchAccounts()"
              class="btn btn-primary"
            >
              Search
            </button>
          </div>

          @if (searchedAccount()) {
            <div class="p-6 border border-border/20 rounded-2xl bg-background/30 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-3">
                <h4 class="font-bold text-foreground text-base">Account Configuration</h4>
                <div>
                  <span class="text-xs text-zinc-500 font-bold">Account Number:</span>
                  <div class="text-sm font-mono text-foreground">{{ searchedAccount()?.accountNumber }}</div>
                </div>
                <div>
                  <span class="text-xs text-zinc-500 font-bold">Current Balance:</span>
                  <div class="text-sm font-bold text-foreground">{{ searchedAccount()?.balance | currency:'PHP':'symbol' }}</div>
                </div>
                <div>
                  <span class="text-xs text-zinc-500 font-bold">Status:</span>
                  <div class="text-sm font-bold text-foreground">{{ searchedAccount()?.status === 0 ? 'Active' : searchedAccount()?.status === 1 ? 'Frozen' : 'Closed' }}</div>
                </div>
                <div class="flex gap-2 pt-2">
                  <button
                    (click)="updateAccountStatus(0)"
                    class="btn btn-accent btn-sm"
                  >
                    Activate
                  </button>
                  <button
                    (click)="updateAccountStatus(1)"
                    class="btn btn-secondary btn-sm"
                  >
                    Freeze
                  </button>
                  <button
                    (click)="updateAccountStatus(2)"
                    class="btn btn-danger btn-sm"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div class="space-y-3">
                <h4 class="font-bold text-foreground text-base">Individual Limit Overrides</h4>
                <div>
                  <label class="block text-xs text-zinc-500 font-bold mb-1">Per-Transaction limit cap (₱)</label>
                  <input
                    type="number"
                    [(ngModel)]="overridePerTrans"
                    class="input"
                  />
                </div>
                <div>
                  <label class="block text-xs text-zinc-500 font-bold mb-1">Daily limit cap (₱)</label>
                  <input
                    type="number"
                    [(ngModel)]="overrideDaily"
                    class="input"
                  />
                </div>
                <button
                  (click)="saveLimitOverrides()"
                  class="btn btn-primary btn-block mt-2"
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
        <div class="glass-card p-6 rounded-3xl space-y-6 animate-slide-up">
          <div class="flex justify-between items-center border-b border-border/10 pb-4">
            <div>
              <h3 class="text-lg font-bold text-foreground">General Ledger Real-time Auditing</h3>
              <p class="text-xs text-foreground/70">Compare active customer deposit totals against double-entry ledger liquidity entries.</p>
            </div>
            <button
              (click)="loadReconciliation()"
              class="btn btn-primary btn-sm"
            >
              Run Audit Reconciliation
            </button>
          </div>

          @if (reconReport()) {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div class="p-5 bg-background/30 border border-border/20 rounded-2xl">
                <span class="text-xs text-zinc-500 font-bold">Customer Deposits Total</span>
                <div class="text-xl font-extrabold text-foreground mt-1">
                  {{ reconReport()?.totalAccountBalances | currency:'PHP':'symbol' }}
                </div>
              </div>
              <div class="p-5 bg-background/30 border border-border/20 rounded-2xl">
                <span class="text-xs text-zinc-500 font-bold">Ledger Credit Balances</span>
                <div class="text-xl font-extrabold text-foreground mt-1">
                  {{ reconReport()?.totalLedgerCredits | currency:'PHP':'symbol' }}
                </div>
              </div>
              <div class="p-5 bg-background/30 border border-border/20 rounded-2xl">
                <span class="text-xs text-zinc-500 font-bold">Ledger Debit Balances</span>
                <div class="text-xl font-extrabold text-foreground mt-1">
                  {{ reconReport()?.totalLedgerDebits | currency:'PHP':'symbol' }}
                </div>
              </div>
              <div class="p-5 bg-background/30 border border-border/20 rounded-2xl">
                <span class="text-xs text-zinc-500 font-bold">Auditing Reconciliation</span>
                <div
                  [class]="reconReport()?.isReconciled ? 'text-emerald-500 dark:text-[#00d47e]' : 'text-red-500'"
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