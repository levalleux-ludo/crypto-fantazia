import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface ICardDetails {
  cardId: number;
  cardText: string;
  impl: string;
  properties: {[key: string]: string};
}

@Injectable({
  providedIn: 'root'
})
export class CardService {

  constructor(
    private apiService: ApiService
  ) { }

  async getChances(): Promise<ICardDetails[]> {
    return new Promise((resolve, reject) => {
      this.apiService.get<ICardDetails[]>('card/chance').subscribe((cards) => {
        resolve(cards);
      }, err => reject(err));
    });
  }
  getCommunityChests(): Promise<ICardDetails[]> {
    return new Promise((resolve, reject) => {
      this.apiService.get<ICardDetails[]>('card/cc').subscribe((cards) => {
        resolve(cards);
      }, err => reject(err));
    });
  }

  computeText(card: ICardDetails) {
    let text = card.cardText;
    for (const property in card.properties) {
      if (card.properties.hasOwnProperty(property)) {
        text = text.replace(`%${property.toUpperCase()}%`, card.properties[property]);
      }
    }
    return text;
  }

}
