import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  users = new Map<string, string>();
  constructor(
    private apiService: ApiService
  ) { }

  async getUser(tezosAccountId: string): Promise<any> {
    return new Promise<string>((resolve, reject) => {
      if (this.users.has(tezosAccountId)) {
        resolve(this.users.get(tezosAccountId));
      } else {
        this.apiService.get<any>(`user/${tezosAccountId}`).subscribe((user) => {
          this.users.set(tezosAccountId, user);
          resolve(user);
        }, err => reject(err));
      }
    });
  }
}
