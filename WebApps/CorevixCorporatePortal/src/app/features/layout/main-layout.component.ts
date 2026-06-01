import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen flex bg-background text-foreground transition-all duration-300">
      <!-- Sidebar -->
      <aside class="w-64 bg-card border-r border-border flex flex-col justify-between">
        <div>
          <div class="h-16 flex items-center px-6 border-b border-border">
            <span class="text-xl font-bold tracking-wider text-primary">Corevix</span>
            <span class="ml-1 text-xs font-semibold uppercase px-1.5 py-0.5 bg-primary/10 text-primary rounded">Corp</span>
          </div>
          <nav class="p-4 space-y-1">
            <a routerLink="/dashboard" routerLinkActive="bg-primary/10 text-primary" class="flex items-center px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/5 transition">
              Dashboard
            </a>
            <a routerLink="/transactions" routerLinkActive="bg-primary/10 text-primary" class="flex items-center px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/5 transition">
              Audits & Monitoring
            </a>
          </nav>
        </div>

        <div class="p-4 border-t border-border flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium opacity-70">Theme</span>
            <button (click)="themeService.toggleTheme()" class="p-2 rounded-lg hover:bg-primary/10 border border-border text-xs font-semibold">
              @if (themeService.isDarkMode()) {
                ☀️ Light
              } @else {
                🌙 Dark
              }
            </button>
          </div>
          
          <button (click)="logout()" class="w-full flex items-center justify-center gap-2 py-2 px-3 border border-border hover:border-red-500/30 hover:bg-red-500/10 text-red-500 text-xs font-bold rounded-lg transition duration-200">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
            Sign Out
          </button>
        </div>
      </aside>

      <!-- Main Panel -->
      <div class="flex-1 flex flex-col">
        <header class="h-16 bg-card border-b border-border flex items-center justify-between px-8">
          <h1 class="text-lg font-semibold">Corporate Portal</h1>
          <div class="flex items-center space-y-4">
            <span class="text-sm font-medium">Bank Administrator</span>
          </div>
        </header>

        <main class="flex-1 p-8 overflow-y-auto">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `
})
export class MainLayoutComponent {
  themeService = inject(ThemeService);
  authService = inject(AuthService);
  router = inject(Router);

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
