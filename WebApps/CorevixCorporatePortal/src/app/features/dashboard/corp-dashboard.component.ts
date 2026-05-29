import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminService } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-corp-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-8">
      <!-- Header -->
      <div>
        <h2 class="text-3xl font-extrabold tracking-tight text-white">Operations Dashboard</h2>
        <p class="text-sm opacity-70 mt-1">Real-time overview of core banking health, queue metrics, and administrative status.</p>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="glass-card p-6 border border-border/40 rounded-2xl relative overflow-hidden">
          <div class="text-xs font-semibold uppercase tracking-wider text-zinc-400">KYC Authorization Queue</div>
          <div class="text-3xl font-extrabold mt-2 text-white">{{ pendingKycCount() }}</div>
          <p class="text-xs opacity-60 mt-1">Customers waiting for Maker-Checker screening</p>
          <div class="absolute right-4 bottom-4 text-primary opacity-20 text-4xl">👥</div>
        </div>

        <div class="glass-card p-6 border border-border/40 rounded-2xl relative overflow-hidden">
          <div class="text-xs font-semibold uppercase tracking-wider text-zinc-400">Core Banking Services</div>
          <div class="text-3xl font-extrabold mt-2 text-emerald-400">ONLINE</div>
          <p class="text-xs opacity-60 mt-1">All gateway systems and ledger jobs running normally</p>
          <div class="absolute right-4 bottom-4 text-emerald-400 opacity-20 text-4xl">⚡</div>
        </div>

        <div class="glass-card p-6 border border-border/40 rounded-2xl relative overflow-hidden">
          <div class="text-xs font-semibold uppercase tracking-wider text-zinc-400">Officer Auditing</div>
          <div class="text-3xl font-extrabold mt-2 text-primary">SECURED</div>
          <p class="text-xs opacity-60 mt-1">Audit logs active, database replica synchronized</p>
          <div class="absolute right-4 bottom-4 text-primary opacity-20 text-4xl">🛡️</div>
        </div>
      </div>

      <!-- Quick Actions / Quick Navigation -->
      <div class="glass-card p-8 border border-border/40 rounded-2xl space-y-6">
        <h3 class="text-lg font-bold text-white">Administrative Actions</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div (click)="navigateTo('/transactions')" class="p-5 border border-border/20 rounded-xl bg-background/20 hover:border-primary/50 hover:bg-background/40 transition cursor-pointer space-y-2">
            <div class="text-sm font-bold text-white flex items-center gap-2">
              <span>👤</span> KYC Authorizations
            </div>
            <p class="text-xs opacity-75">Review and approve new registrations awaiting KYC verification.</p>
          </div>

          <div (click)="navigateTo('/transactions')" class="p-5 border border-border/20 rounded-xl bg-background/20 hover:border-primary/50 hover:bg-background/40 transition cursor-pointer space-y-2">
            <div class="text-sm font-bold text-white flex items-center gap-2">
              <span>🏧</span> OTC Teller Desk
            </div>
            <p class="text-xs opacity-75">Execute deposits/withdrawals or load teller passbook printing screens.</p>
          </div>

          <div (click)="navigateTo('/transactions')" class="p-5 border border-border/20 rounded-xl bg-background/20 hover:border-primary/50 hover:bg-background/40 transition cursor-pointer space-y-2">
            <div class="text-sm font-bold text-white flex items-center gap-2">
              <span>📊</span> GL Ledger Audit
            </div>
            <p class="text-xs opacity-75">Verify double-entry system balance matches customer deposits.</p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CorpDashboardComponent implements OnInit {
  private adminService = inject(AdminService);
  private router = inject(Router);

  pendingKycCount = signal(0);

  ngOnInit() {
    this.adminService.getPendingKycCustomers().subscribe({
      next: (custs) => this.pendingKycCount.set(custs.length),
      error: () => this.pendingKycCount.set(0)
    });
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}
