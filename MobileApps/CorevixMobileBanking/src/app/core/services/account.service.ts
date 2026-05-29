import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AccountDetailsDto {
  id: string;
  accountNumber: string;
  accountType: number; // 0=Savings, 1=Checking, 2=TimeDeposit
  balance: number;
  currency: string;
  status: number;
  customerId: string;
  isCardLocked?: boolean;
}

export interface TransactionDto {
  id: string;
  referenceNumber: string;
  amount: number;
  transactionType: number;
  status: number;
  sourceAccountId?: string;
  destinationAccountId?: string;
  description: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getAccounts(customerId: string): Observable<AccountDetailsDto[]> {
    return this.http.get<AccountDetailsDto[]>(`${this.apiUrl}/customers/${customerId}/accounts`);
  }

  openAccount(payload: any): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/accounts`, payload);
  }

  getTransactions(accountId: string, pageNumber: number = 1, pageSize: number = 10): Observable<TransactionDto[]> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<TransactionDto[]>(`${this.apiUrl}/accounts/${accountId}/transactions`, { params });
  }

  transfer(sourceAccountId: string, payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/accounts/${sourceAccountId}/transfers`, payload);
  }

  payBill(accountId: string, payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/accounts/${accountId}/bill-payments`, payload);
  }

  getPassbook(accountId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/accounts/${accountId}/passbook`);
  }

  applyLoan(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/accounts/${payload.disbursalAccountId}/loans`, payload);
  }

  openTimeDeposit(sourceAccountId: string, payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/accounts/${sourceAccountId}/time-deposits`, payload);
  }

  toggleCardLock(accountId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/accounts/${accountId}/cards/lock`, {});
  }

  updateCardLimits(accountId: string, payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/accounts/${accountId}/cards/limits`, payload);
  }
}
