import { Routes } from '@angular/router';
import { MainLayoutComponent } from './features/layout/main-layout.component';
import { AuthLayoutComponent } from './features/layout/auth-layout.component';
import { Component } from '@angular/core';

@Component({
  standalone: true,
  template: `
    <div class="bg-card p-8 border border-border rounded-xl shadow-sm">
      <h2 class="text-2xl font-bold mb-2">My Accounts</h2>
      <p class="text-foreground opacity-80 mb-6">Manage your digital savings and checking portfolios.</p>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="p-6 border border-border bg-background rounded-xl">
          <div class="flex justify-between items-start">
            <span class="text-sm font-semibold opacity-70">eSavings Account</span>
            <span class="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full font-medium">Active</span>
          </div>
          <div class="text-3xl font-extrabold mt-4">₱45,280.50</div>
          <div class="text-xs opacity-60 mt-2">Account No: 1024-5829-22</div>
        </div>

        <div class="p-6 border border-border bg-background rounded-xl">
          <div class="flex justify-between items-start">
            <span class="text-sm font-semibold opacity-70">Digital Checking Account</span>
            <span class="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full font-medium">Active</span>
          </div>
          <div class="text-3xl font-extrabold mt-4">₱12,500.00</div>
          <div class="text-xs opacity-60 mt-2">Account No: 1024-9912-34</div>
        </div>
      </div>
    </div>
  `
})
export class ClientDashboardComponent {}

@Component({
  standalone: true,
  template: `
    <div class="bg-card p-8 border border-border rounded-xl shadow-sm">
      <h2 class="text-2xl font-bold mb-4">Send Money</h2>
      <p class="text-foreground opacity-80">Intra-bank transfers and InstaPay/PESONet portal integrations will go here.</p>
    </div>
  `
})
export class TransfersComponent {}

@Component({
  standalone: true,
  template: `
    <div class="bg-card p-8 border border-border rounded-xl shadow-sm">
      <h2 class="text-2xl font-bold mb-4">Investments & Deposits</h2>
      <p class="text-foreground opacity-80">Explore time deposits, unit investment trust funds, and savings interest builders.</p>
    </div>
  `
})
export class InvestmentsComponent {}

@Component({
  standalone: true,
  template: `
    <div>
      <h2 class="text-xl font-bold mb-2">Welcome to Corevix</h2>
      <p class="text-sm opacity-80 mb-6">Sign in to manage your finances.</p>
      <form class="space-y-4">
        <div>
          <label class="block text-xs font-semibold uppercase mb-1">Username / Email</label>
          <input type="text" class="w-full p-2.5 border border-border rounded-lg bg-background text-foreground" placeholder="customer_1">
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase mb-1">Password</label>
          <input type="password" class="w-full p-2.5 border border-border rounded-lg bg-background text-foreground" placeholder="••••••••">
        </div>
        <button type="button" class="w-full py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition">
          Secure Login
        </button>
      </form>
    </div>
  `
})
export class ClientLoginComponent {}

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: ClientDashboardComponent },
      { path: 'transfers', component: TransfersComponent },
      { path: 'investments', component: InvestmentsComponent }
    ]
  },
  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: [
      { path: 'login', component: ClientLoginComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];
