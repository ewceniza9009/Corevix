import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkModeSignal = signal<boolean>(
    localStorage.getItem('theme') === 'dark' ||
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  isDarkMode = this.darkModeSignal.asReadonly();

  constructor() {
    effect(() => {
      const dark = this.darkModeSignal();
      if (dark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    });
  }

  toggleTheme() {
    this.darkModeSignal.update(val => !val);
  }

  setDarkTheme(dark: boolean) {
    this.darkModeSignal.set(dark);
  }
}
