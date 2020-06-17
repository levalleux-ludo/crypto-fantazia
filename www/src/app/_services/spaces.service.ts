import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { AlertService } from './alert.service';

export enum eSpaceType {
  GENESIS = 'GENESIS',
  COVID = 'COVID',
  QUARANTINE = 'QUARANTINE',
  CHANCE = 'CHANCE',
  COMMUNITY = 'COMMUNITY',
  MINING_FARM = 'MINING_FARM',
  BAKERY = 'BAKERY',
  MARKETPLACE = 'MARKETPLACE',
  EXCHANGE = 'EXCHANGE',
  STARTUP = 'STARTUP'
}

export enum eStartupType {
  MINING_FARM = 'MINING_FARM',
  BAKERY = 'BAKERY',
  MARKETPLACE = 'MARKETPLACE',
  EXCHANGE = 'EXCHANGE',
  FIN_TECH = 'FIN_TECH',
  LAW_TECH = 'LAW_TECH',
  BIO_TECH = 'BIO_TECH',
  EDUCATION = 'EDUCATION',
  HW_WALLET = 'HW_WALLET',
  GAME = 'GAME',
  SOCIAL = 'SOCIAL'
}

export interface ISpace {
  spaceId: number;
  title: string;
  type: eSpaceType;
  family: number;
  subtype: eStartupType;
  detail: string;
  price: number;
  image: string;
  featureCost: number;
  rentRates: number[];
}

@Injectable({
  providedIn: 'root'
})
export class SpacesService {

  private spaces = [];

  constructor(
    private apiService: ApiService,
    private alertService: AlertService
  ) { }

  public getSpaces(): Promise<ISpace[]> {
    return new Promise((resolve, reject) => {
      if (this.spaces.length === 0) {
        this.apiService.get<ISpace[]>('space').subscribe((spaces) => {
          this.spaces = spaces;
          resolve(this.spaces);
        }, err => reject(err));
      } else {
        resolve(this.spaces);
      }
    });
  }
}
