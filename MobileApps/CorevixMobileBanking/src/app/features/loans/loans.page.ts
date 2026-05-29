import { Component, OnInit, inject, signal } from '@angular/core';
import { AccountService, AccountDetailsDto } from '../../core/services/account.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-loans',
  templateUrl: './loans.page.html',
  styleUrls: ['./loans.page.scss'],
  standalone: false
})
export class LoansPage implements OnInit {
  private accountService = inject(AccountService);
  authService = inject(AuthService);

  accounts = signal<AccountDetailsDto[]>([]);
  sourceAccountId = '';

  // TD inputs
  tdAmount = 0;
  tdTerm = 90;

  // Loan inputs
  loanAmount = 0;
  loanTerm = 12;

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
      error: () => this.errorMessage.set('Failed to load accounts.')
    });
  }

  getAccountTypeName(type: number): string {
    switch (type) {
      case 0: return 'Savings';
      case 1: return 'Checking';
      default: return 'Account';
    }
  }

  openTimeDeposit() {
    if (!this.sourceAccountId || this.tdAmount <= 0) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload = {
      amount: this.tdAmount,
      termDays: this.tdTerm
    };

    this.accountService.openTimeDeposit(this.sourceAccountId, payload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set(`Placements of ₱${this.tdAmount.toFixed(2)} completed successfully.`);
        this.tdAmount = 0;
        this.loadAccounts();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Time Deposit creation failed.');
      }
    });
  }

  applyLoan() {
    if (!this.sourceAccountId || this.loanAmount <= 0) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload = {
      customerId: this.authService.customerId(),
      principalAmount: this.loanAmount,
      termMonths: this.loanTerm,
      disbursalAccountId: this.sourceAccountId
    };

    this.accountService.applyLoan(payload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set(`Applied for a ₱${this.loanAmount.toFixed(2)} loan successfully (Pending approval).`);
        this.loanAmount = 0;
        this.loadAccounts();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Loan application submission failed.');
      }
    });
  }
}
