import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GameService {

  isConnected = false;

  game = undefined;

  constructor(
    private apiService: ApiService
  ) { }

  createSession(username: string): Observable<{sessionId: string}> {
    return this.apiService.post<{sessionId: string}>('game/create', { creator: username });
  }

  connectSession(sessionId: string, username: string): Observable<{sessionId: string}> {
    return this.apiService.get<{sessionId: string}>(`game/${sessionId}`);
  }

  getAllSessions(): Observable<any[]> {
    return this.apiService.get<any[]>(`game`);
  }

}
