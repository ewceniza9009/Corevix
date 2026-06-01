import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="min-h-screen bg-background text-foreground transition-all duration-300 relative overflow-hidden">
      <!-- Glow effects in background -->
      <div class="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-primary-hover/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      <router-outlet></router-outlet>
    </div>
  `
})
export class AuthLayoutComponent {}
