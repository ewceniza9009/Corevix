import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { AccountService, AccountDetailsDto } from '../../core/services/account.service';
import jsQR from 'jsqr';

@Component({
  selector: 'app-qr-center',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="text-left mb-4">
        <h2 class="text-3xl font-extrabold text-foreground">QR Payments Hub</h2>
        <p class="text-sm text-foreground/60 mt-1">Scan or generate QR codes for instantaneous balance transfers</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Generate QR Code -->
        <div class="glass-card p-6 border border-border/40 rounded-2xl flex flex-col items-center justify-center text-center">
          <h3 class="text-lg font-bold text-foreground mb-4">My Account QR Code</h3>
          
          <div class="w-full mb-4">
            <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-foreground/60 text-left">Select Account</label>
            <select
              [(ngModel)]="selectedAccountId"
              (change)="onAccountChange()"
              class="w-full h-10 px-3 border border-border rounded-xl bg-card text-foreground text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            >
              @for (acc of accounts(); track acc.id) {
                <option [value]="acc.id">{{ acc.accountNumber }} - {{ acc.balance | currency:'PHP':'symbol' }}</option>
              }
            </select>
          </div>

          <div class="p-4 bg-white rounded-2xl shadow-inner mb-4 flex items-center justify-center w-52 h-52 relative">
            @if (qrCodeString()) {
              <!-- Real, scannable QR Code image from secure open API -->
              <img 
                [src]="'https://api.qrserver.com/v1/create-qr-code/?size=160x160&color=025864&data=' + encodeUri(qrCodeString()!)" 
                alt="Account QR Code" 
                class="w-40 h-40 object-contain animate-fade-in"
              />
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
          <h3 class="text-lg font-bold text-foreground mb-2">Pay via QR Code</h3>
          
          <!-- Scanner Mode Selector -->
          <div class="flex gap-2 p-1 bg-background/50 border border-border/10 rounded-xl text-xs font-bold w-fit">
            <button 
              type="button" 
              (click)="setScanMode('camera')"
              [class]="scanMode() === 'camera' ? 'bg-primary text-white rounded-lg px-3 py-1.5' : 'text-zinc-400 hover:text-foreground px-3 py-1.5'"
            >
              Use Camera
            </button>
            <button 
              type="button" 
              (click)="setScanMode('file')"
              [class]="scanMode() === 'file' ? 'bg-primary text-white rounded-lg px-3 py-1.5' : 'text-zinc-400 hover:text-foreground px-3 py-1.5'"
            >
              Upload Image
            </button>
          </div>

          <!-- Camera Stream Section -->
          @if (scanMode() === 'camera') {
            <div class="relative w-full aspect-video bg-black rounded-2xl overflow-hidden flex flex-col items-center justify-center border border-border/20 shadow-inner">
              <video id="scanner-video" class="w-full h-full object-cover"></video>
              @if (!isScanning()) {
                <div class="absolute inset-0 flex flex-col items-center justify-center bg-black/40 gap-3">
                  <button type="button" (click)="startCamera()" class="btn btn-primary">
                    Start Camera Scanner
                  </button>
                </div>
              } @else {
                <div class="absolute top-3 right-3 z-20">
                  <button type="button" (click)="stopCamera()" class="btn btn-danger btn-sm">
                    Stop Camera
                  </button>
                </div>
                <!-- Scanning animation overlay box -->
                <div class="absolute inset-0 border-[3px] border-emerald-500/20 pointer-events-none flex items-center justify-center">
                  <div class="w-32 h-32 border border-emerald-500 rounded-xl relative overflow-hidden animate-pulse">
                    <div class="absolute top-0 left-0 w-full h-[2px] bg-emerald-500 animate-bounce"></div>
                  </div>
                </div>
              }
            </div>
          }

          <!-- File Upload Section -->
          @if (scanMode() === 'file') {
            <div class="p-6 border-2 border-dashed border-border/40 rounded-2xl flex flex-col items-center justify-center text-center gap-3 bg-background/20 hover:bg-background/40 transition">
              <svg class="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"/></svg>
              <div>
                <p class="text-xs font-bold text-foreground">Select a QR code image file</p>
                <p class="text-[10px] text-zinc-500 mt-1">Supports PNG, JPG, or SVG containing a valid account payload.</p>
              </div>
              <input 
                type="file" 
                accept="image/*" 
                (change)="onFileSelected($event)" 
                class="hidden" 
                id="file-scanner-input"
              />
              <button 
                type="button" 
                (click)="triggerFileInput()" 
                class="btn btn-secondary btn-sm"
              >
                Choose File
              </button>
            </div>
          }

          @if (errorMessage()) {
            <div class="alert alert-error">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              {{ errorMessage() }}
            </div>
          }
          @if (successMessage()) {
            <div class="alert alert-success">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              {{ successMessage() }}
            </div>
          }

          <form (ngSubmit)="handleQrPay()" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-foreground/60">Select Source Account</label>
              <select
                [(ngModel)]="sourceAccountId"
                name="sourceAccount"
                required
                class="w-full h-10 px-3 border border-border rounded-xl bg-card text-foreground text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              >
                @for (acc of accounts(); track acc.id) {
                  <option [value]="acc.id">{{ acc.accountNumber }} - {{ acc.balance | currency:'PHP':'symbol' }}</option>
                }
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-foreground/60">Scanned QR Code Payload</label>
              <input
                type="text"
                name="qrPayload"
                [(ngModel)]="qrPayload"
                placeholder="Scanner will fill this automatically..."
                readonly
                required
                class="w-full h-10 px-3 border border-border rounded-xl bg-card text-foreground/50 text-[13px] font-medium focus:outline-none cursor-not-allowed"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-foreground/60">Amount to Transfer (₱)</label>
              <input
                type="number"
                name="amount"
                [(ngModel)]="amount"
                placeholder="0.00"
                required
                min="1"
                class="w-full h-10 px-3 border border-border rounded-xl bg-card text-foreground text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            <button
              type="submit"
              [disabled]="isLoading() || !sourceAccountId || !qrPayload || amount <= 0"
              class="btn btn-primary btn-block"
            >
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"/><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z"/></svg>
              {{ isLoading() ? 'Processing Payment...' : 'Execute QR Payment' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  `
})
export class QrCenterComponent implements OnInit, OnDestroy {
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

  // Scanner properties
  scanMode = signal<'camera' | 'file'>('file');
  isScanning = signal(false);
  private videoStream: MediaStream | null = null;
  private animationFrameId: number | null = null;

  ngOnInit() {
    this.loadAccounts();
  }

  ngOnDestroy() {
    this.stopCamera();
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
    } else {
      this.qrCodeString.set(null);
    }
  }

  encodeUri(val: string): string {
    return encodeURIComponent(val);
  }

  setScanMode(mode: 'camera' | 'file') {
    this.scanMode.set(mode);
    this.stopCamera();
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  triggerFileInput() {
    const el = document.getElementById('file-scanner-input') as HTMLInputElement;
    if (el) el.click();
  }

  onFileSelected(event: any) {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
            this.qrPayload = code.data;
            this.successMessage.set(`Successfully scanned QR Code from file: ${code.data}`);
          } else {
            this.errorMessage.set('Could not find a valid QR Code in the uploaded image.');
          }
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  startCamera() {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isScanning.set(true);

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        this.videoStream = stream;
        const video = document.getElementById('scanner-video') as HTMLVideoElement;
        if (video) {
          video.srcObject = stream;
          video.setAttribute('playsinline', 'true');
          video.play().then(() => {
            this.animationFrameId = requestAnimationFrame(() => this.scanFrame());
          });
        }
      })
      .catch(() => {
        this.isScanning.set(false);
        this.errorMessage.set('Could not access camera device. Please verify camera permissions.');
      });
  }

  stopCamera() {
    this.isScanning.set(false);
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private scanFrame() {
    if (!this.isScanning()) return;

    const video = document.getElementById('scanner-video') as HTMLVideoElement;
    if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code) {
          this.qrPayload = code.data;
          this.successMessage.set(`Successfully scanned QR Code: ${code.data}`);
          this.stopCamera();
          return;
        }
      }
    }
    this.animationFrameId = requestAnimationFrame(() => this.scanFrame());
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