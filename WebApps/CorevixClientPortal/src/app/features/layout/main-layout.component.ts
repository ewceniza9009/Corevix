import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';

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
            <span class="ml-1 text-xs font-semibold uppercase px-1.5 py-0.5 bg-primary/10 text-primary rounded">Retail</span>
          </div>
          <nav class="p-4 space-y-1">
            <a routerLink="/dashboard" routerLinkActive="bg-primary/10 text-primary" class="flex items-center px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/5 transition">
              My Accounts
            </a>
            <a routerLink="/transfers" routerLinkActive="bg-primary/10 text-primary" class="flex items-center px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/5 transition">
              Send Money
            </a>
            <a routerLink="/investments" routerLinkActive="bg-primary/10 text-primary" class="flex items-center px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/5 transition">
              Investments
            </a>
          </nav>
        </div>

        <div class="p-4 border-t border-border flex items-center justify-between">
          <span class="text-xs font-medium opacity-70">Theme</span>
          <button (click)="themeService.toggleTheme()" class="p-2 rounded-lg hover:bg-primary/10 border border-border">
            @if (themeService.isDarkMode()) {
              ☀️ Light
            } @else {
              🌙 Dark
            }
          </button>
        </div>
      </aside>

      <!-- Main Panel -->
      <div class="flex-1 flex flex-col">
        <header class="h-16 bg-card border-b border-border flex items-center justify-between px-8">
          <h1 class="text-lg font-semibold">Client Portal</h1>
          <div class="flex items-center space-y-4">
            <span class="text-sm font-medium">Hello, Valued Customer</span>
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
}
