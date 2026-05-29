import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AccountService, AccountDetailsDto } from '../../core/services/account.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { HttpClient } from '@angular/common/http';

interface AlertDto {
  id: number;
  message: string;
  time: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false
})
export class DashboardPage implements OnInit {
  accountService = inject(AccountService);
  authService = inject(AuthService);
  themeService = inject(ThemeService);
  private router = inject(Router);
  private http = inject(HttpClient);

  accounts = signal<AccountDetailsDto[]>([]);
  selectedAccount = signal<AccountDetailsDto | null>(null);

  // Simulation parameters
  simDepositAmount = 0;
  simWithdrawAmount = 0;

  // Alerts array
  alerts = signal<AlertDto[]>([
    { id: 1, message: 'Welcome to Corevix Mobile Secure Portal.', time: 'Just now' }
  ]);

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
      error: () => {
        this.errorMessage.set('Failed to load banking accounts.');
      }
    });
  }

  selectAccount(acc: AccountDetailsDto) {
    this.selectedAccount.set(acc);
    this.simDepositAmount = 0;
    this.simWithdrawAmount = 0;
  }

  getAccountTypeName(type: number): string {
    switch (type) {
      case 0: return 'Savings Account';
      case 1: return 'Checking Account';
      case 2: return 'Time Deposit';
      default: return 'Deposit Account';
    }
  }

  simulateDeposit() {
    const acc = this.selectedAccount();
    if (!acc || this.simDepositAmount <= 0) return;

    const payload = {
      accountId: acc.id,
      amount: this.simDepositAmount,
      description: 'Simulated Cash-In via Mobile Desk',
      idempotencyKey: Math.random().toString(36).substring(2, 15)
    };

    const url = `${this.authService['apiUrl']}/accounts/${acc.id}/deposit`;
    this.http.post(url, payload).subscribe({
      next: () => {
        this.successMessage.set(`Deposited ₱${this.simDepositAmount.toFixed(2)}.`);
        this.addAlert(`Deposited ₱${this.simDepositAmount.toFixed(2)} to ${acc.accountNumber}.`);
        this.simDepositAmount = 0;
        this.loadAccounts();
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
      description: 'Simulated Cash-Out via Mobile ATM',
      idempotencyKey: Math.random().toString(36).substring(2, 15)
    };

    const url = `${this.authService['apiUrl']}/accounts/${acc.id}/withdraw`;
    this.http.post(url, payload).subscribe({
      next: () => {
        this.successMessage.set(`Withdrew ₱${this.simWithdrawAmount.toFixed(2)}.`);
        this.addAlert(`Withdrew ₱${this.simWithdrawAmount.toFixed(2)} from ${acc.accountNumber}.`);
        this.simWithdrawAmount = 0;
        this.loadAccounts();
      },
      error: (err: any) => this.errorMessage.set(err.error?.error || 'Withdrawal failed.')
    });
  }

  addAlert(message: string) {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.alerts.update(val => [
      { id: Date.now(), message, time: timeString },
      ...val
    ]);
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  toggleBiometrics(event: any) {
    const isChecked = event.detail.checked;
    if (isChecked) {
      this.authService.enableBiometrics();
    } else {
      this.authService.disableBiometrics();
    }
  }

  handleLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
