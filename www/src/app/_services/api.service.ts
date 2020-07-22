import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiUrlService } from './api-url.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  protected hostApiUrl = environment.api_url;
  protected port = 8080;
  protected httpOptions = {
    headers: new HttpHeaders({'Content-Type': 'application/json' })
  };
  protected eventSource;

  constructor(
    protected http: HttpClient,
    protected zone: NgZone,
    protected apiUrlService: ApiUrlService
    ) {
      this.apiUrlService.apiUrl.subscribe((url) => {
        if (url) {
          this.test(url).subscribe(() => {
            console.log('Set API URL: ', url);
            this.hostApiUrl = url;
            this.ready.next(true);
          }, err => {
            console.error('Bad url: ' + url);
          });
        }
      });
    }

  ready: BehaviorSubject<boolean> = new BehaviorSubject(false);

  test(apiUrl: string): Observable<any> {
    return this.http.get(apiUrl, {responseType: 'text'});
  }

  get<T>(apiUrl: string): Observable<T> {
    const url = `${this.hostApiUrl}/${apiUrl}`;
    return this.http.get<T>(url);
  }

  post<T>(apiUrl: string, data: any): Observable<T> {
    const url = `${this.hostApiUrl}/${apiUrl}`;
    return this.http.post<T>(url, data, this.httpOptions);
  }

  connectSSE(apiUrl: string): Observable<any> {
    const url = `${this.hostApiUrl}/${apiUrl}`;
    return new Observable((observer) => {
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = undefined;
      }
      this.eventSource = new EventSource(url);
      this.eventSource.addEventListener('message', message => {
        console.log(`on message1, data=${JSON.stringify(message)}`);
      });
      this.eventSource.onmessage = (event) => {
        console.log(`on message2, event=${JSON.stringify(event)}`);
        this.zone.run(() => observer.next(JSON.parse(event.data)));
      };
      this.eventSource.onerror = (err) => {
        observer.error(err);
      };
    });
  }

  disconnectSSE() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }
  }
}
