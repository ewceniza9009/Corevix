import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen flex bg-transparent text-foreground p-4 gap-6 overflow-hidden transition-colors duration-300">
      <!-- Sidebar (Frosted Floating Panel) -->
      <aside 
        [class]="isCollapsed() ? 'w-20' : 'w-64'"
        class="glass-panel rounded-[2rem] flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out relative z-30"
      >
        <div>
          <!-- Logo Header -->
          <div class="h-20 flex items-center gap-3 px-6 border-b border-border/20 overflow-hidden">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#38bdf8] to-[#6366f1] flex items-center justify-center text-white font-extrabold text-sm shadow-lg shadow-indigo-500/20 shrink-0">
              C
            </div>
            @if (!isCollapsed()) {
              <div class="flex flex-col animate-fade-in">
                <span class="text-md font-bold tracking-tight text-foreground leading-none">Corevix</span>
                <span class="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase mt-1">Retail Banking</span>
              </div>
            }
          </div>

          <!-- Navigation Links -->
          <nav class="p-4 space-y-1.5">
            <a routerLink="/dashboard" routerLinkActive="bg-gradient-to-r from-primary/10 to-indigo-500/5 text-primary border-l-2 border-primary" [class.justify-center]="isCollapsed()" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:text-foreground hover:bg-slate-200/50 dark:hover:bg-white/5 transition-all duration-200" title="My Accounts">
              <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" /></svg>
              @if (!isCollapsed()) { <span class="animate-fade-in">My Accounts</span> }
            </a>
            <a routerLink="/transfers" routerLinkActive="bg-gradient-to-r from-primary/10 to-indigo-500/5 text-primary border-l-2 border-primary" [class.justify-center]="isCollapsed()" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:text-foreground hover:bg-slate-200/50 dark:hover:bg-white/5 transition-all duration-200" title="Send Money">
              <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
              @if (!isCollapsed()) { <span class="animate-fade-in">Send Money</span> }
            </a>
            <a routerLink="/bills" routerLinkActive="bg-gradient-to-r from-primary/10 to-indigo-500/5 text-primary border-l-2 border-primary" [class.justify-center]="isCollapsed()" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:text-foreground hover:bg-slate-200/50 dark:hover:bg-white/5 transition-all duration-200" title="Pay Bills">
              <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
              @if (!isCollapsed()) { <span class="animate-fade-in">Pay Bills</span> }
            </a>
            <a routerLink="/qr" routerLinkActive="bg-gradient-to-r from-primary/10 to-indigo-500/5 text-primary border-l-2 border-primary" [class.justify-center]="isCollapsed()" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:text-foreground hover:bg-slate-200/50 dark:hover:bg-white/5 transition-all duration-200" title="QR Center">
              <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M4 8h.01M4 16h.01M4 20h4M4 4h4m12 0h-4" /></svg>
              @if (!isCollapsed()) { <span class="animate-fade-in">QR Center</span> }
            </a>
            <a routerLink="/investments" routerLinkActive="bg-gradient-to-r from-primary/10 to-indigo-500/5 text-primary border-l-2 border-primary" [class.justify-center]="isCollapsed()" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:text-foreground hover:bg-slate-200/50 dark:hover:bg-white/5 transition-all duration-200" title="Investments">
              <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              @if (!isCollapsed()) { <span class="animate-fade-in">Investments</span> }
            </a>
          </nav>
        </div>

        <!-- Sidebar Footer Info -->
        <div class="p-4 border-t border-border/20 flex flex-col gap-3 overflow-hidden">
          <div class="flex items-center justify-between">
            @if (!isCollapsed()) {
              <span class="text-xs font-semibold text-zinc-500 animate-fade-in">Theme</span>
            }
            <button (click)="themeService.toggleTheme()" class="p-2 rounded-xl bg-card hover:bg-slate-200 dark:hover:bg-[#1a253f] border border-border/30 text-zinc-400 hover:text-foreground transition duration-200 flex items-center justify-center" [class.w-full]="isCollapsed()">
              @if (themeService.isDarkMode()) {
                ☀️ @if (!isCollapsed()) { <span class="ml-2 text-xs font-bold animate-fade-in">Light</span> }
              } @else {
                🌙 @if (!isCollapsed()) { <span class="ml-2 text-xs font-bold animate-fade-in">Dark</span> }
              }
            </button>
          </div>
          
          <div class="flex items-center gap-2 shrink-0">
            <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
            @if (!isCollapsed()) {
              <span class="text-xs font-semibold text-zinc-500 animate-fade-in">Secure Connection</span>
            }
          </div>
        </div>
      </aside>

      <!-- Main Panel (Floating Content Area) -->
      <div class="flex-1 flex flex-col overflow-hidden gap-6">
        <!-- Header Panel -->
        <header class="h-20 glass-panel rounded-[2rem] flex items-center justify-between px-8 shrink-0 relative z-30">
          <div class="flex items-center gap-4">
            <!-- Sidebar toggle button -->
            <button (click)="toggleSidebar()" class="p-2 rounded-xl bg-card hover:bg-slate-200 dark:hover:bg-[#1a253f] border border-border/30 text-zinc-400 hover:text-foreground transition mr-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span class="text-lg font-bold tracking-tight text-foreground">Client Portal</span>
            <span class="text-xs bg-slate-200 dark:bg-[#1e293b] text-zinc-500 dark:text-zinc-400 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">v2.0</span>
          </div>
          
          <div class="flex items-center gap-6">
            <!-- Theme Toggle Button in Header -->
            <button (click)="themeService.toggleTheme()" class="p-2 rounded-xl bg-card hover:bg-slate-200 dark:hover:bg-[#1a253f] border border-border/30 text-zinc-400 hover:text-foreground transition duration-200 flex items-center justify-center" title="Toggle Theme">
              @if (themeService.isDarkMode()) {
                ☀️ <span class="ml-2 text-xs font-bold hidden sm:inline">Light Mode</span>
              } @else {
                🌙 <span class="ml-2 text-xs font-bold hidden sm:inline">Dark Mode</span>
              }
            </button>

            <!-- Mock notifications -->
            <button class="relative p-2 rounded-xl bg-card hover:bg-slate-200 dark:hover:bg-[#1a253f] border border-border/30 transition text-zinc-400 hover:text-foreground">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              <span class="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-card"></span>
            </button>
            
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white text-sm shadow-md">
                U
              </div>
              <div class="flex flex-col">
                <span class="text-sm font-bold text-foreground leading-tight">Valued Customer</span>
                <span class="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Active User</span>
              </div>
            </div>
          </div>
        </header>

        <!-- Main Content Area -->
        <main class="flex-1 p-8 overflow-y-auto bg-transparent rounded-[2rem] transition-colors duration-300">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `
})
export class MainLayoutComponent {
  themeService = inject(ThemeService);
  isCollapsed = signal(false);

  toggleSidebar() {
    this.isCollapsed.update(val => !val);
  }
}


