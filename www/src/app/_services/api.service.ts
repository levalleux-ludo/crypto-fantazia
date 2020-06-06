import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  protected host = 'http://localhost';
  protected port = 8080;
  protected httpOptions = {
    headers: new HttpHeaders({'Content-Type': 'application/json' })
  };

  constructor(protected http: HttpClient) { }

  get<T>(apiUrl: string): Observable<T> {
    const url = `${this.host}:${this.port}/${apiUrl}`;
    return this.http.get<T>(url);
  }

  post<T>(apiUrl: string, data: any): Observable<T> {
    const url = `${this.host}:${this.port}/${apiUrl}`;
    return this.http.post<T>(url, data, this.httpOptions);
  }
}
