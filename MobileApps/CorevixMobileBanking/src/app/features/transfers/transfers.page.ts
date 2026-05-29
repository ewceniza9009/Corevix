import { Component, OnInit, inject, signal } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { AccountService, AccountDetailsDto } from '../../core/services/account.service';
import { AuthService } from '../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-transfers',
  templateUrl: './transfers.page.html',
  styleUrls: ['./transfers.page.scss'],
  standalone: false
})
export class TransfersPage implements OnInit {
  private accountService = inject(AccountService);
  private authService = inject(AuthService);
  private alertCtrl = inject(AlertController);
  private http = inject(HttpClient);

  accounts = signal<AccountDetailsDto[]>([]);
  sourceAccountId = '';
  transferType = signal<'internal' | 'external'>('internal');
  destAccountId = '';
  destAccountNumber = '';
  amount = 0;
  description = '';

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
      error: () => this.errorMessage.set('Failed to load accounts for transfer.')
    });
  }

  getAccountTypeName(type: number): string {
    switch (type) {
      case 0: return 'Savings';
      case 1: return 'Checking';
      case 2: return 'Time Deposit';
      default: return 'Account';
    }
  }

  handleTransfer() {
    if (!this.sourceAccountId || this.amount <= 0) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload = {
      destinationAccountNumber: this.transferType() === 'internal'
        ? this.accounts().find(a => a.id === this.destAccountId)?.accountNumber
        : this.destAccountNumber,
      amount: this.amount,
      description: this.description,
      idempotencyKey: Math.random().toString(36).substring(2, 15)
    };

    if (!payload.destinationAccountNumber) {
      this.isLoading.set(false);
      this.errorMessage.set('Invalid destination account.');
      return;
    }

    this.accountService.transfer(this.sourceAccountId, payload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set(`Transferred ₱${this.amount.toFixed(2)} successfully.`);
        this.amount = 0;
        this.description = '';
        this.destAccountNumber = '';
        this.destAccountId = '';
        this.loadAccounts();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Transfer failed.');
      }
    });
  }

  async openQrScanner() {
    if (!this.sourceAccountId) {
      this.errorMessage.set('Please select a source wallet first before scanning a QR code.');
      return;
    }

    // Displays a mock QR camera finder
    const alert = await this.alertCtrl.create({
      header: 'QR Scanner Cam',
      message: 'Simulated scanner active. Select a mock recipient target to scan:',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Scan Teller Shop QR',
          handler: () => {
            this.executeQrPayment('QRPAY-TELLER-MERCHANT-01', 500, 'Simulated QR Pay to Merchant');
          }
        },
        {
          text: 'Scan Peer Transfer QR',
          handler: () => {
            this.executeQrPayment('QRPAY-PEER-VAULT-02', 1200, 'Simulated Peer QR transfer');
          }
        }
      ]
    });

    await alert.present();
  }

  executeQrPayment(qrString: string, amt: number, desc: string) {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload = {
      qrCodeString: qrString,
      amount: amt,
      description: desc,
      idempotencyKey: Math.random().toString(36).substring(2, 15)
    };

    const url = `${this.authService['apiUrl']}/accounts/${this.sourceAccountId}/qr-pay`;
    this.http.post(url, payload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set(`Successfully paid ₱${amt.toFixed(2)} via scanned QR code.`);
        this.loadAccounts();
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'QR Payment execution failed.');
      }
    });
  }
}
