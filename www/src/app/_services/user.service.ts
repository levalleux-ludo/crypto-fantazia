import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface IUserDetails {
  userName: string;
  tezosAccountId: string;
  avatar: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  async connect(username: string, tezosAccountId: string, avatar: string) {
    return new Promise((resolve, reject) => {
      // call apiService
      this.apiService.post<any>(
        'user',
        {userName: username, tezosAccountId: tezosAccountId, avatar: avatar}
      ).subscribe(() => {
        resolve();
      }, err => reject(err));
    });
  }

  users = new Map<string, IUserDetails>();
  constructor(
    private apiService: ApiService
  ) { }

  async getUser(tezosAccountId: string): Promise<IUserDetails | undefined> {
    return new Promise((resolve, reject) => {
      if (this.users.has(tezosAccountId)) {
        resolve(this.users.get(tezosAccountId));
      } else {
        this.apiService.get<IUserDetails>(`user/${tezosAccountId}`).subscribe((user) => {
          this.users.set(tezosAccountId, user);
          resolve(user);
        }, err => reject(err));
      }
    });
  }
}
