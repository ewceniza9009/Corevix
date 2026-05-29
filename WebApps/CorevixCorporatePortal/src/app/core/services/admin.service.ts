import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PendingKycCustomerDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  idType?: string;
  idNumber?: string;
  idImageUri?: string;
  selfieImageUri?: string;
}

export interface GlReconciliationReport {
  totalAccountBalances: number;
  totalLedgerCredits: number;
  totalLedgerDebits: number;
  netLedgerPosition: number;
  discrepancy: number;
  isReconciled: boolean;
  totalAccounts: number;
  totalLedgerEntries: number;
  reportGeneratedAtUtc: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getPendingKycCustomers(): Observable<PendingKycCustomerDto[]> {
    return this.http.get<PendingKycCustomerDto[]>(`${this.baseUrl}/customers/pending-kyc`);
  }

  approveKyc(customerId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/customers/${customerId}/approve-kyc`, {});
  }

  getGlReconciliation(): Observable<GlReconciliationReport> {
    return this.http.get<GlReconciliationReport>(`${this.baseUrl}/compliance/gl-reconciliation`);
  }
}
