import { Routes } from '@angular/router';
import { MainLayoutComponent } from './features/layout/main-layout.component';
import { AuthLayoutComponent } from './features/layout/auth-layout.component';
import { ClientDashboardComponent } from './features/dashboard/client-dashboard.component';
import { TransfersComponent } from './features/transfers/transfers.component';
import { ClientLoginComponent } from './features/auth/client-login.component';
import { ClientRegisterComponent } from './features/auth/client-register.component';
import { QrCenterComponent } from './features/qr/qr-center.component';
import { BillPayComponent } from './features/bills/bill-pay.component';
import { authGuard } from './core/guards/auth.guard';
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-8 animate-fade-in text-foreground">
      <!-- Title -->
      <div class="pb-6 border-b border-border/10">
        <h2 class="text-4xl font-black tracking-tight bg-gradient-to-r from-[#38bdf8] to-[#6366f1] bg-clip-text text-transparent">Investments & Wealth</h2>
        <p class="text-sm text-foreground/70 mt-2">Grow your digital wealth and track active portfolios instantly.</p>
      </div>
 
      <!-- Overview stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="p-6 glass-card rounded-3xl relative overflow-hidden group">
          <div class="absolute -right-6 -bottom-6 w-24 h-24 bg-[#38bdf8]/5 rounded-full blur-xl group-hover:bg-[#38bdf8]/10 transition-all"></div>
          <span class="text-xs font-bold uppercase tracking-wider text-zinc-500 block">Total Invested</span>
          <span class="text-3xl font-black text-foreground mt-2 block">₱150,000.00</span>
        </div>
        <div class="p-6 glass-card rounded-3xl relative overflow-hidden group">
          <div class="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all"></div>
          <span class="text-xs font-bold uppercase tracking-wider text-zinc-500 block">Interest Accrued (YTD)</span>
          <span class="text-3xl font-black text-emerald-500 dark:text-emerald-400 mt-2 block">+₱8,450.00</span>
        </div>
        <div class="p-6 glass-card rounded-3xl relative overflow-hidden group">
          <div class="absolute -right-6 -bottom-6 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-all"></div>
          <span class="text-xs font-bold uppercase tracking-wider text-zinc-500 block">Portfolio APY</span>
          <span class="text-3xl font-black text-indigo-500 dark:text-indigo-400 mt-2 block">4.85%</span>
        </div>
      </div>
 
      <!-- Main Layout Columns -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Interactive ROI Calculator -->
        <div class="lg:col-span-2 p-6 glass-card rounded-3xl space-y-6">
          <h3 class="text-lg font-bold text-foreground flex items-center gap-2">
            <span>🧮</span> Interactive ROI Calculator
          </h3>
          
          <div class="space-y-4">
            <div>
              <div class="flex justify-between text-xs font-bold mb-2">
                <span class="text-zinc-500">Principal Investment</span>
                <span class="text-[#38bdf8]">₱{{ principalAmount() | number }}</span>
              </div>
              <input type="range" min="1000" max="1000000" step="5000" [(ngModel)]="calcPrincipal" (input)="updateCalculator()" class="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#38bdf8]">
            </div>
 
            <div>
              <div class="flex justify-between text-xs font-bold mb-2">
                <span class="text-zinc-500">Investment Term</span>
                <span class="text-[#38bdf8]">{{ calcTerm() }} Days</span>
              </div>
              <select [(ngModel)]="selectedRateIndex" (change)="updateCalculator()" class="w-full px-3 py-2.5 border border-border bg-card rounded-xl text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option [value]="0">90 Days Term (4.50% APY)</option>
                <option [value]="1">180 Days Term (4.75% APY)</option>
                <option [value]="2">360 Days Term (5.00% APY)</option>
              </select>
            </div>
          </div>
 
          <div class="p-5 bg-background/50 rounded-2xl border border-border grid grid-cols-2 gap-4 text-center">
            <div>
              <span class="text-xs text-zinc-500 font-semibold">Earned Interest</span>
              <div class="text-2xl font-black text-emerald-500 dark:text-emerald-400 mt-1">₱{{ earnedInterest() | number:'1.2-2' }}</div>
            </div>
            <div>
              <span class="text-xs text-zinc-500 font-semibold">Total Maturity Payout</span>
              <div class="text-2xl font-black text-foreground mt-1">₱{{ totalPayout() | number:'1.2-2' }}</div>
            </div>
          </div>
        </div>
 
        <!-- Wealth Tips -->
        <div class="p-6 glass-card rounded-3xl space-y-4">
          <h3 class="text-lg font-bold text-foreground flex items-center gap-2">
            <span>💡</span> Smart Investing
          </h3>
          <div class="space-y-4 text-xs">
            <div class="p-3 bg-background/50 border border-border rounded-xl">
              <p class="font-bold text-foreground mb-1">Time Deposits are Locked</p>
              <p class="text-zinc-500 dark:text-zinc-400 leading-normal">Maturity payments are automated and processed directly into your disbursal account once the term ends.</p>
            </div>
            <div class="p-3 bg-background/50 border border-border rounded-xl">
              <p class="font-bold text-foreground mb-1">Compound Your Profits</p>
              <p class="text-zinc-400 leading-normal">Re-investing mature payouts yields higher dynamic velocity limits and improves your customer trust score.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class InvestmentsComponent {
  calcPrincipal = 50000;
  principalAmount = signal(50000);
  calcTerm = signal(360);
  selectedRateIndex = 2;
  
  rates = [0.045, 0.0475, 0.05];
  terms = [90, 180, 360];

  earnedInterest = signal(50000 * 0.05 * (360 / 365));
  totalPayout = signal(50000 + (50000 * 0.05 * (360 / 365)));

  updateCalculator() {
    this.principalAmount.set(Number(this.calcPrincipal));
    this.calcTerm.set(this.terms[Number(this.selectedRateIndex)]);
    const rate = this.rates[Number(this.selectedRateIndex)];
    const interest = this.principalAmount() * rate * (this.calcTerm() / 365);
    this.earnedInterest.set(interest);
    this.totalPayout.set(this.principalAmount() + interest);
  }
}

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: ClientDashboardComponent },
      { path: 'transfers', component: TransfersComponent },
      { path: 'qr', component: QrCenterComponent },
      { path: 'bills', component: BillPayComponent },
      { path: 'investments', component: InvestmentsComponent }
    ]
  },
  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: [
      { path: 'login', component: ClientLoginComponent },
      { path: 'register', component: ClientRegisterComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];
