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
import { Component } from '@angular/core';

@Component({
  standalone: true,
  template: `
    <div class="glass-card p-8 border border-border rounded-2xl shadow-sm">
      <h2 class="text-2xl font-bold mb-4">Investments & Deposits</h2>
      <p class="text-foreground opacity-80">Explore time deposits, unit investment trust funds, and savings interest builders.</p>
    </div>
  `
})
export class InvestmentsComponent {}

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
