import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class ApiUrlService {
  apiUrl: BehaviorSubject <string>;
  constructor(public route: ActivatedRoute) {
    this.apiUrl = new BehaviorSubject(localStorage.getItem('api_url'));
    this.route.queryParams.subscribe((params) => {
      console.log('route params', params);
      if (params.api_url !== undefined) {
        this.apiUrl.next(params.api_url);
        localStorage.setItem('api_url', params.api_url);
      }
    });
  }
}
