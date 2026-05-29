import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage {
  authService = inject(AuthService);
  themeService = inject(ThemeService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);

  email = '';
  password = '';

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  handleLogin() {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/tabs/dashboard']);
      },
      error: err => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Authentication failed.');
      }
    });
  }

  async handleBiometricLogin() {
    const alert = await this.alertCtrl.create({
      header: 'Biometric Login',
      message: 'Place your finger on the sensor or scan FaceID.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Scan (Mock Match)',
          handler: () => {
            this.isLoading.set(true);
            // In a real device, you trigger Capacitor Native Biometrics.
            // On success, we retrieve the stored credentials and login.
            // Here, we simulate a login for the user using their saved email.
            const savedEmail = localStorage.getItem('email') || 'mockuser@corevix.com';
            this.authService.login(savedEmail, 'BiometricAuthorizedPass').subscribe({
              next: () => {
                this.isLoading.set(false);
                this.router.navigate(['/tabs/dashboard']);
              },
              error: () => {
                // If the token is invalid, log in with password
                this.isLoading.set(false);
                this.errorMessage.set('Biometric lookup failed. Please use password.');
              }
            });
          }
        }
      ]
    });

    await alert.present();
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
