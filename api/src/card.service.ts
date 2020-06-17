import { dbEvents } from "./db/db";
import { Chance, dropChances, dropCCs, CommunityChest, ICardDetails } from "./db/card.model";
import { GameConfig } from "./game.service";
import chances from './chances.json';
import communitychests from './community-chests.json';

export enum eCardType {
    CHANCE = 'CHANCE',
    COMMUNITY_CHEST = 'COMMUNITY_CHEST'
}

class CardService {

    constructor() {
        dbEvents.on('connected', () => {
            dropChances().then(async () => {
                let cardId = 0;
                for (let card of chances.chances) {
                    const properties = this.buildCardDetailsProperties(card);
                    const c = new Chance({
                        cardId: cardId++,
                        cardText: card.text,
                        impl: card.impl,
                        properties
                    });
                    await c.save();
                }
            }).catch((err) => console.error(err));
            dropCCs().then(async () => {
                let cardId = 0;
                for (let card of communitychests["community-chests"]) {
                    const properties = this.buildCardDetailsProperties(card);
                    const c = new CommunityChest({
                        cardId: cardId++,
                        cardText: card.text,
                        impl: card.impl,
                        properties
                    });
                    await c.save();
                }
            }).catch((err) => console.error(err));
        });
    }

    buildCardDetailsProperties(card: any): Map<string, string> {
        const properties = new Map;
        if (card.amount) {
            properties.set('amount', card.amount.toFixed(0));
        }
        if (card.nb) {
            properties.set('nb', card.nb.toFixed(0));
        }
        if (card.space) {
            properties.set('space', card.space.toFixed(0));
        }
        return properties;
    }

    async getByCardId(type: eCardType, id: number): Promise<ICardDetails | null> {
        let card;
        switch (type) {
            case eCardType.CHANCE: {
                card = await Chance.findOne({cardId: id});
            }
            case eCardType.COMMUNITY_CHEST: {
                card = await CommunityChest.findOne({cardId: id});
            }
        }
        return card;
    }
    
    async getAll(type: eCardType): Promise<ICardDetails[]> {
        switch (type) {
            case eCardType.CHANCE: {
                return await Chance.find();        
            }
            case eCardType.COMMUNITY_CHEST: {
                return await CommunityChest.find();        
            }
        }
    }

}

export const cardService = new CardService();