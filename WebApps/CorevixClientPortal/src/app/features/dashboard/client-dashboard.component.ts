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
    <div class="space-y-6 animate-fade-in text-foreground relative z-10 font-sans">
      <!-- Top Search & Date Filter Bar -->
      <div class="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 pb-4 border-b border-border/20">
        <div class="relative flex-1 max-w-md">
          <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </span>
          <input type="text" placeholder="Search transactions, bills, or vaults..." class="w-full pl-10 pr-4 py-2 border border-border bg-card/60 dark:bg-card/30 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40">
        </div>
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <div class="flex items-center gap-2 px-3 py-2 border border-border bg-card/60 dark:bg-card/30 rounded-xl font-bold text-zinc-500">
            <span>📅</span>
            <span>18 Oct 2024 - 18 Nov 2024</span>
          </div>
          <select class="px-3 py-2 border border-border bg-card/60 dark:bg-card/30 rounded-xl font-bold text-zinc-500 focus:outline-none">
            <option>Last 30 days</option>
            <option>Last 6 months</option>
            <option>All time</option>
          </select>
          <button (click)="printStatement()" class="px-3.5 py-2 bg-card hover:bg-slate-200/50 dark:hover:bg-zinc-800 border border-border text-zinc-600 dark:text-zinc-300 font-bold rounded-xl transition flex items-center gap-1.5">
            <span>📤</span> Export
          </button>
          <button (click)="loadDashboard()" class="p-2 border border-border bg-card hover:bg-slate-200/50 dark:hover:bg-zinc-800 text-zinc-500 hover:text-foreground rounded-xl transition" title="Refresh Dashboard">
            <span>🔄</span>
          </button>
        </div>
      </div>

      <!-- Quick Action Banners & Errors -->
      @if (errorMessage()) {
        <div class="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs flex items-center gap-2.5">
          <span>⚠️</span>
          <span class="font-bold">{{ errorMessage() }}</span>
        </div>
      }
      @if (successMessage()) {
        <div class="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-center gap-2.5">
          <span>🎉</span>
          <span class="font-bold">{{ successMessage() }}</span>
        </div>
      }

      <!-- Total Balance Card (Sequence Deep Teal Theme) -->
      <div class="p-6 bg-[#025864] rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <!-- Abstract tiled decorative pattern -->
        <div class="absolute inset-0 opacity-[0.07] pointer-events-none mix-blend-overlay">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <rect width="32" height="32" rx="6" fill="white" transform="rotate(15 16 16)"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>
        </div>

        <div class="space-y-1 z-10">
          <span class="text-[11px] font-bold uppercase tracking-wider text-white/70 block">Total Balance</span>
          <div class="flex items-baseline gap-2.5">
            <span class="text-3xl md:text-4xl font-extrabold tracking-tight">
              ₱{{ selectedAccount()?.balance | number:'1.2-2' }}
            </span>
            <span class="px-2 py-0.5 rounded bg-[#00D47E]/20 text-[#00D47E] text-[10px] font-bold">15.8% ↑</span>
          </div>
        </div>

        <div class="flex flex-wrap gap-2 z-10 w-full md:w-auto">
          <button (click)="showOpenAccountModal.set(true)" class="flex-1 md:flex-none px-4 py-2 bg-[#00D47E] hover:bg-[#00c072] text-[#025864] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5">
            <span>+</span> Add
          </button>
          <button (click)="showGcashModal.set(true)" class="flex-1 md:flex-none px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5">
            <span>📱</span> Send
          </button>
          <button (click)="showGcashModal.set(true)" class="flex-1 md:flex-none px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5">
            <span>🔄</span> Request
          </button>
          <div class="relative">
            <button (click)="showOpenAccountModal.set(true)" class="p-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-white transition flex items-center justify-center" title="Options">
              <span>•••</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Main Columns Layout -->
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        <!-- Left Side Column (8 Cols on XL) -->
        <div class="xl:col-span-8 space-y-6">
          
          <!-- Cash Flow Chart Container -->
          <div class="p-5 bg-card border border-border rounded-3xl space-y-4">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2">
                <span class="text-zinc-400 font-extrabold text-sm">↑↓</span>
                <h3 class="text-sm font-extrabold text-foreground">Cash Flow</h3>
              </div>
              <div class="flex items-center gap-1 bg-slate-100 dark:bg-zinc-900 p-0.5 rounded-lg text-[10px] font-bold">
                <button class="px-2.5 py-1 rounded-md bg-card shadow-sm text-foreground">Weekly</button>
                <button class="px-2.5 py-1 text-zinc-500 rounded-md">Daily</button>
                <button class="px-2.5 py-1 text-zinc-500 rounded-md">Manage</button>
              </div>
            </div>

            <!-- Double-sided vertical rounded column bar chart matching Dipa Shot -->
            <div class="w-full pt-4">
              <div class="h-44 flex items-end justify-between px-2 relative">
                <!-- Zero Line -->
                <div class="absolute top-[55%] left-0 right-0 border-t border-dashed border-border/80 z-0"></div>

                @for (day of getCashFlowData(); track day.name) {
                  <div class="flex flex-col items-center flex-1 group z-10">
                    <!-- Inflow bar (goes up) -->
                    <div class="w-2.5 sm:w-3.5 bg-[#025864] rounded-t-full transition-all group-hover:opacity-85" [style.height.px]="day.in * 0.7"></div>
                    <!-- Outflow bar (goes down, with gap) -->
                    <div class="w-2.5 sm:w-3.5 bg-[#00D47E] rounded-b-full mt-1.5 transition-all group-hover:opacity-85" [style.height.px]="day.out * 0.5"></div>
                    <span class="text-[9px] text-zinc-400 font-semibold mt-3 select-none">{{ day.name }}</span>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Vault Account Cards Grid -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Dynamic Vault Cards / Accounts -->
            @for (acc of accounts().slice(0, 3); track acc.id) {
              <div 
                (click)="selectAccount(acc)"
                [class]="selectedAccount()?.id === acc.id ? 'border-[#025864] ring-2 ring-[#025864]/10 bg-card' : 'border-border bg-card/70'"
                class="p-4 border rounded-2xl cursor-pointer hover:border-primary/50 transition-all duration-200 flex flex-col justify-between min-h-[110px]"
              >
                <div class="flex justify-between items-start">
                  <span class="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
                    {{ getAccountTypeName(acc.accountType) }}
                  </span>
                  <span class="text-[9px] font-mono text-zinc-400">••••{{ acc.accountNumber.slice(-4) }}</span>
                </div>
                <div class="mt-4">
                  <span class="text-xs text-zinc-500 font-semibold">Balance</span>
                  <div class="text-lg font-black text-foreground mt-0.5">
                    ₱{{ acc.balance | number:'1.2-2' }}
                  </div>
                </div>
                <div class="flex items-center justify-between mt-2 pt-2 border-t border-border/10 text-[9px] font-bold">
                  <span class="text-[#00D47E]">Active Status</span>
                  <span class="text-zinc-400">Last 30 days</span>
                </div>
              </div>
            }
          </div>

          <!-- Official Statement Ledger Table -->
          <div class="p-5 bg-card border border-border rounded-3xl space-y-4">
            <div class="flex justify-between items-center">
              <div>
                <h3 class="text-sm font-extrabold text-foreground">Official Statement Ledger</h3>
                <p class="text-[10px] text-zinc-400 font-medium">Selected Vault: {{ selectedAccount() ? getAccountTypeName(selectedAccount()!.accountType) : '' }} (•••• {{ selectedAccount()?.accountNumber?.slice(-4) }})</p>
              </div>
              <div class="flex gap-2">
                <button (click)="printStatement()" class="px-3 py-1.5 border border-border text-[10px] font-bold rounded-lg text-zinc-500 hover:text-foreground transition flex items-center gap-1">
                  🖨️ Export PDF
                </button>
              </div>
            </div>

            <div class="overflow-x-auto max-h-[350px] overflow-y-auto pr-1">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-border/50 text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider">
                    <th class="pb-3 px-3">Timestamp</th>
                    <th class="pb-3 px-3">Description</th>
                    <th class="pb-3 px-3 text-right">Debit</th>
                    <th class="pb-3 px-3 text-right">Credit</th>
                    <th class="pb-3 px-3 text-right">Ledger Balance</th>
                  </tr>
                </thead>
                <tbody class="text-xs divide-y divide-border/10">
                  @for (line of passbookLines(); track line.sequence) {
                    <tr class="hover:bg-slate-50 dark:hover:bg-zinc-900/40 transition duration-150">
                      <td class="py-3 px-3 font-mono text-[10px] text-zinc-400">{{ line.date | date:'yyyy-MM-dd HH:mm' }}</td>
                      <td class="py-3 px-3 font-bold text-foreground">{{ line.description }}</td>
                      <td class="py-3 px-3 text-right font-black text-red-500">
                        {{ line.debit ? '-' + (line.debit | currency:'PHP':'symbol') : '' }}
                      </td>
                      <td class="py-3 px-3 text-right font-black text-emerald-500">
                        {{ line.credit ? '+' + (line.credit | currency:'PHP':'symbol') : '' }}
                      </td>
                      <td class="py-3 px-3 text-right font-mono font-bold text-foreground/80">
                        {{ line.balance | currency:'PHP':'symbol' }}
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="py-6 text-center text-zinc-500 text-xs">No passbook statements recorded. Make a deposit below.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Right Side Column (4 Cols on XL) -->
        <div class="xl:col-span-4 space-y-6">
          
          <!-- Income / Expense Mini Widgets -->
          <div class="grid grid-cols-2 gap-4">
            <div class="p-4 bg-card border border-border rounded-2xl flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-[#025864]/10 flex items-center justify-center text-[#025864]">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
              </div>
              <div>
                <span class="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Income</span>
                <span class="text-xs font-black text-foreground">₱{{ totalDeposits() | number:'1.0-0' }}</span>
              </div>
            </div>
            <div class="p-4 bg-card border border-border rounded-2xl flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-[#00D47E]/10 flex items-center justify-center text-[#00D47E]">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5"/></svg>
              </div>
              <div>
                <span class="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block">Expense</span>
                <span class="text-xs font-black text-foreground">₱{{ totalWithdrawals() | number:'1.0-0' }}</span>
              </div>
            </div>
          </div>

          <!-- Dynamic Premium Debit Card Display -->
          <div class="p-5 bg-card border border-border rounded-3xl space-y-4">
            <div class="flex justify-between items-center">
              <h3 class="text-xs font-extrabold text-foreground uppercase tracking-wider">My Card</h3>
              <button (click)="toggleCardLock()" class="text-[10px] font-bold text-primary hover:underline">
                {{ selectedAccount()?.isCardLocked ? 'Unlock Card' : 'Lock Card' }}
              </button>
            </div>

            <!-- Visa Card Skin -->
            <div 
              [class]="selectedAccount()?.isCardLocked 
                ? 'bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900 opacity-80'
                : 'bg-[#025864] text-white'"
              class="relative w-full h-44 rounded-2xl p-5 flex flex-col justify-between shadow-lg overflow-hidden group transition-all duration-300 border border-white/5"
            >
              <!-- Glowing Vector Ring Background Pattern -->
              <div class="absolute -right-8 -top-8 w-28 h-28 border border-white/10 rounded-full pointer-events-none"></div>
              <div class="absolute -right-4 -top-4 w-28 h-28 border border-white/5 rounded-full pointer-events-none"></div>
              
              <div class="flex justify-between items-start z-10">
                <span class="text-xs font-black tracking-widest uppercase italic">VISA</span>
                <div class="w-8 h-6 rounded bg-gradient-to-tr from-amber-400 to-amber-200 opacity-80"></div>
              </div>

              <div class="z-10">
                <span class="text-[18px] font-mono tracking-widest block text-white/95">
                  •••• •••• •••• {{ selectedAccount() ? selectedAccount()!.accountNumber.slice(-4) : '••••' }}
                </span>
                <span class="text-[9px] uppercase tracking-wider text-white/60 block mt-1">₱{{ selectedAccount()?.balance | number:'1.2-2' }}</span>
              </div>

              <div class="flex justify-between items-end z-10">
                <div>
                  <span class="text-[8px] uppercase tracking-widest text-white/40 block">Card Holder</span>
                  <span class="text-[10px] font-bold text-white/90">Valued Customer</span>
                </div>
                <span class="text-[9px] font-bold text-white/70">12 / 29</span>
              </div>
            </div>

            <!-- Card Limits Adjuster -->
            <div class="space-y-3 pt-2 text-xs">
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block mb-1">Txn Limit</label>
                  <input type="number" [(ngModel)]="cardPerTransLimit" class="w-full px-2.5 py-1.5 border border-border bg-background rounded-lg text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                </div>
                <div>
                  <label class="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block mb-1">Daily Cap</label>
                  <input type="number" [(ngModel)]="cardDailyLimit" class="w-full px-2.5 py-1.5 border border-border bg-background rounded-lg text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                </div>
              </div>
              <button (click)="updateCardLimits()" class="w-full py-2 bg-[#025864] hover:bg-[#013f47] text-white text-[10px] font-bold rounded-lg transition duration-200">
                Apply Card Limits
              </button>
            </div>
          </div>

          <!-- Operations Sandbox -->
          <div class="p-5 bg-card border border-border rounded-3xl space-y-4">
            <h3 class="text-xs font-extrabold text-foreground uppercase tracking-wider">Operations Sandbox</h3>
            <div class="space-y-3 text-xs">
              <div>
                <label class="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block mb-1">Simulate Cashier Deposit</label>
                <div class="flex gap-2">
                  <input type="number" placeholder="Amount" [(ngModel)]="simDepositAmount" class="w-full px-2.5 py-1.5 border border-border bg-background rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[#025864]">
                  <button (click)="simulateDeposit()" class="px-3 py-1.5 bg-[#025864] hover:bg-[#013f47] text-white font-bold rounded-lg transition">Deposit</button>
                </div>
              </div>
              <div>
                <label class="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider block mb-1">Simulate ATM Withdrawal</label>
                <div class="flex gap-2">
                  <input type="number" placeholder="Amount" [(ngModel)]="simWithdrawAmount" class="w-full px-2.5 py-1.5 border border-border bg-background rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-red-500">
                  <button (click)="simulateWithdrawal()" class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition">Withdraw</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MODALS -->
      @if (showOpenAccountModal()) {
        <div class="fixed inset-0 bg-slate-900/40 dark:bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div class="p-5 bg-card border border-border rounded-3xl max-w-sm w-full space-y-4 shadow-2xl">
            <h3 class="text-md font-bold text-foreground border-b border-border pb-2">Open New Vault Portfolios</h3>
            <div class="space-y-3 text-xs">
              <div>
                <label class="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Type</label>
                <select [(ngModel)]="newAccountType" class="w-full px-3 py-2 border border-border bg-background rounded-xl text-xs text-foreground focus:outline-none">
                  <option [value]="0">Savings Vault</option>
                  <option [value]="1">Checking Vault</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Branch</label>
                <select [(ngModel)]="newAccountBranch" class="w-full px-3 py-2 border border-border bg-background rounded-xl text-xs text-foreground focus:outline-none">
                  <option value="0001">Makati (HQ)</option>
                  <option value="0002">Cebu</option>
                  <option value="0003">Manila</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Initial (₱)</label>
                <input type="number" [(ngModel)]="newAccountDeposit" class="w-full px-3 py-2 border border-border bg-background rounded-xl text-xs text-foreground focus:outline-none">
              </div>
            </div>
            <div class="flex justify-end gap-2 pt-2 text-xs">
              <button (click)="showOpenAccountModal.set(false)" class="px-4 py-2 border border-border rounded-xl text-zinc-500 hover:text-foreground transition">Cancel</button>
              <button (click)="openNewAccount()" class="px-4 py-2 bg-[#025864] text-white font-bold rounded-xl transition">Confirm</button>
            </div>
          </div>
        </div>
      }

      @if (showGcashModal()) {
        <div class="fixed inset-0 bg-slate-900/40 dark:bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div class="p-5 bg-card border border-border rounded-3xl max-w-sm w-full space-y-4 shadow-2xl">
            <h3 class="text-md font-bold text-foreground border-b border-border pb-2">GCash Integration</h3>
            <div class="space-y-3 text-xs">
              <div>
                <label class="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Mobile No</label>
                <input type="text" [(ngModel)]="gcashPhone" placeholder="0917xxxxxxx" class="w-full px-3 py-2 border border-border bg-background rounded-xl text-xs text-foreground focus:outline-none">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Amount (₱)</label>
                <input type="number" [(ngModel)]="gcashAmount" placeholder="0.00" class="w-full px-3 py-2 border border-border bg-background rounded-xl text-xs text-foreground focus:outline-none">
              </div>
            </div>
            <div class="flex justify-end gap-2 pt-2 text-xs">
              <button (click)="showGcashModal.set(false)" class="px-4 py-2 border border-border rounded-xl text-zinc-500 hover:text-foreground transition">Cancel</button>
              <button (click)="executeGcashCashIn()" class="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl transition">Top-Up</button>
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

  activeCardDesign = signal(0);

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
    this.cardPerTransLimit = account.limitOverridePerTransaction ?? 50000;
    this.cardDailyLimit = account.limitOverrideDaily ?? 100000;

    // Load passbook lines
    this.accountService.getPassbook(account.id).subscribe({
      next: (lines) => {
        this.passbookLines.set(lines);
        this.calculateInsights(lines);
      }
    });
  }

  getCashFlowData() {
    const lines = this.passbookLines();
    if (!lines || lines.length === 0) {
      // Default beautiful mock visual data in case no transactions exist yet
      return [
        {name: 'Mon', in: 65, out: 40},
        {name: 'Tue', in: 85, out: 30},
        {name: 'Wed', in: 70, out: 50},
        {name: 'Thu', in: 95, out: 35},
        {name: 'Fri', in: 100, out: 20},
        {name: 'Sat', in: 80, out: 45},
        {name: 'Sun', in: 60, out: 55}
      ];
    }

    const groups: { [key: string]: { in: number, out: number } } = {};
    const days: string[] = [];

    // Group last 7 days from today
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      groups[dateStr] = { in: 0, out: 0 };
      days.push(dateStr);
    }

    lines.forEach(line => {
      if (!line.date) return;
      const dateStr = new Date(line.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (groups[dateStr] !== undefined) {
        if (line.credit) groups[dateStr].in += line.credit;
        if (line.debit) groups[dateStr].out += line.debit;
      }
    });

    let maxVal = 1;
    days.forEach(day => {
      const item = groups[day];
      if (item.in > maxVal) maxVal = item.in;
      if (item.out > maxVal) maxVal = item.out;
    });

    return days.map(day => {
      const item = groups[day];
      return {
        name: day,
        in: Math.max(5, (item.in / maxVal) * 100),
        out: Math.max(5, (item.out / maxVal) * 100)
      };
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