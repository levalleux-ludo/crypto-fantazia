import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GameService {

  constructor(
    private apiService: ApiService
  ) { }

  createSession(username: string): Observable<{sessionId: string}> {
    return this.apiService.post<{sessionId: string}>('game/create', { creator: username });
  }
}
