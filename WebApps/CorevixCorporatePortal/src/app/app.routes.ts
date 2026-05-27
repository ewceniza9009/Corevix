import { Routes } from '@angular/router';
import { MainLayoutComponent } from './features/layout/main-layout.component';
import { AuthLayoutComponent } from './features/layout/auth-layout.component';
import { Component } from '@angular/core';

@Component({
  standalone: true,
  template: `
    <div class="bg-card p-8 border border-border rounded-xl shadow-sm">
      <h2 class="text-2xl font-bold mb-4">Corporate Dashboard</h2>
      <p class="text-foreground opacity-80 mb-6">Welcome to the Corevix Corporate Administrative Portal. Monitor bank status, approval queues, and auditing operations.</p>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="p-6 border border-border bg-background rounded-lg">
          <span class="text-xs font-semibold text-primary uppercase">Active Transations</span>
          <div class="text-3xl font-bold mt-2">1,248</div>
        </div>
        <div class="p-6 border border-border bg-background rounded-lg">
          <span class="text-xs font-semibold text-primary uppercase">Pending Approvals</span>
          <div class="text-3xl font-bold mt-2">14</div>
        </div>
        <div class="p-6 border border-border bg-background rounded-lg">
          <span class="text-xs font-semibold text-primary uppercase">System Status</span>
          <div class="text-3xl font-bold mt-2 text-emerald-500">Online</div>
        </div>
      </div>
    </div>
  `
})
export class CorpDashboardComponent {}

@Component({
  standalone: true,
  template: `
    <div class="bg-card p-8 border border-border rounded-xl shadow-sm">
      <h2 class="text-2xl font-bold mb-4">Audits & Activity Monitoring</h2>
      <p class="text-foreground opacity-80">Full administrative ledger audit logs and transaction traces will appear here.</p>
    </div>
  `
})
export class AuditsComponent {}

@Component({
  standalone: true,
  template: `
    <div>
      <h2 class="text-xl font-bold mb-2">Staff Sign In</h2>
      <p class="text-sm opacity-80 mb-6">Access the Corevix administrative panel.</p>
      <form class="space-y-4">
        <div>
          <label class="block text-xs font-semibold uppercase mb-1">Email Address</label>
          <input type="email" class="w-full p-2.5 border border-border rounded-lg bg-background text-foreground" placeholder="admin@corevix.com">
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase mb-1">Password</label>
          <input type="password" class="w-full p-2.5 border border-border rounded-lg bg-background text-foreground" placeholder="••••••••">
        </div>
        <button type="button" class="w-full py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition">
          Sign In
        </button>
      </form>
    </div>
  `
})
export class CorpLoginComponent {}

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: CorpDashboardComponent },
      { path: 'transactions', component: AuditsComponent }
    ]
  },
  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: [
      { path: 'login', component: CorpLoginComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];
