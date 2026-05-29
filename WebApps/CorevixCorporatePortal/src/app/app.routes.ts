import { Routes } from '@angular/router';
import { MainLayoutComponent } from './features/layout/main-layout.component';
import { AuthLayoutComponent } from './features/layout/auth-layout.component';
import { CorpDashboardComponent } from './features/dashboard/corp-dashboard.component';
import { AuditsComponent } from './features/audits/audits.component';
import { CorpLoginComponent } from './features/auth/corp-login.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
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
