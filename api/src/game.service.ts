import { v4 as uuid } from 'uuid';
import { tezosService } from '../../tezos/src/tezos.service'
import { originator } from '../../tezos/src/token.service'

export interface GameCreationResponseData {
    sessionId: string;
}

class GameService {
    async create(): Promise<GameCreationResponseData> {
        return new Promise((resolve, reject) => {
            const id = uuid();
            console.log('Create game session with Id', id);
            tezosService.initAccount(originator).then(({keyStore, secret}) => {
                console.log('Originator Account is initialized:', keyStore);
                resolve({sessionId: id});
            }).catch(err => reject(err));
        });
    }
}

export const gameService = new GameService();