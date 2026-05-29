import { Component, OnInit, inject, signal } from '@angular/core';
import { AccountService, AccountDetailsDto } from '../../core/services/account.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-cards',
  templateUrl: './cards.page.html',
  styleUrls: ['./cards.page.scss'],
  standalone: false
})
export class CardsPage implements OnInit {
  accountService = inject(AccountService);
  authService = inject(AuthService);

  accounts = signal<AccountDetailsDto[]>([]);
  selectedAccount = signal<AccountDetailsDto | null>(null);

  // Card limits input signals
  cardPerTransLimit = signal<number>(50000);
  cardDailyLimit = signal<number>(100000);

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
      next: (accs) => {
        this.accounts.set(accs);
        if (accs.length > 0) {
          const current = this.selectedAccount();
          const match = accs.find(a => a.id === current?.id);
          this.selectAccount(match || accs[0]);
        }
      },
      error: () => this.errorMessage.set('Failed to load accounts for card settings.')
    });
  }

  selectAccount(acc: AccountDetailsDto) {
    this.selectedAccount.set(acc);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    // Standard default limits
    this.cardPerTransLimit.set(50000);
    this.cardDailyLimit.set(100000);
  }

  getAccountTypeName(type: number): string {
    switch (type) {
      case 0: return 'Savings';
      case 1: return 'Checking';
      default: return 'Account';
    }
  }

  toggleCardLock() {
    const acc = this.selectedAccount();
    if (!acc) return;

    this.isLoading.set(true);
    this.accountService.toggleCardLock(acc.id).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMessage.set(res.isCardLocked ? 'Card locked successfully.' : 'Card unlocked successfully.');
        this.loadAccounts();
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Failed to toggle card lock status.');
      }
    });
  }

  saveCardLimits() {
    const acc = this.selectedAccount();
    if (!acc) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload = {
      perTransactionLimit: this.cardPerTransLimit(),
      dailyLimit: this.cardDailyLimit()
    };

    this.accountService.updateCardLimits(acc.id, payload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('Debit card limits configured successfully.');
        this.loadAccounts();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Failed to update card limits.');
      }
    });
  }
}
