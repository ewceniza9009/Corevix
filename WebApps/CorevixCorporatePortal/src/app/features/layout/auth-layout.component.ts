import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-background text-foreground transition-all duration-300">
      <div class="w-full max-w-md p-8 bg-card border border-border rounded-xl shadow-lg">
        <router-outlet></router-outlet>
      </div>
    </div>
  `
})
export class AuthLayoutComponent {}
