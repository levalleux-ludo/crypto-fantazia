import { v4 as uuid } from 'uuid';
import { tezosService } from '../../tezos/src/tezos.service'
import { originator } from '../../tezos/src/token.service'
import { GameContract } from '../../tezos/src/game.contract';
import { TokenContract } from '../../tezos/src/token.contract';
import Game, { IGame } from './db/game.model';
import { resolve } from 'dns';
import { KeyStore } from '../../tezos/node_modules/conseiljs/dist';

class GameService {
    async create(creator: string): Promise<IGame> {
        return new Promise(async (resolve, reject) => {
            try {
                const sessionId = uuid();
                console.log('Create game session with Id', sessionId);
                const keyStore = await tezosService.getAccount(originator);
                const game = new Game({
                    sessionId: sessionId,
                    status: 'in_creation',
                    creator: creator,
                    contractAddresses: {
                        game: null,
                        token: null
                    }
                });
                await game.save();
                // createContract is called asynchronously
                this.createContracts(keyStore, sessionId, creator).then(async (contracts) => {
                    game.status = 'created';
                    await game.save();
                });
                resolve(game);
            } catch (err) {
                reject(err)
            }
        });
    }

    async createContracts(keyStore: KeyStore, sessionId: string, creator: string): Promise<{game: GameContract, token: TokenContract} | undefined> {
        try {
            const game = await Game.findOne({sessionId: sessionId});
            if (!game) throw new Error('Unable to find the game with sessionId ' + sessionId);

            const gameContract = await GameContract.deploy(keyStore, creator);
            // store gameContract.address for session
            console.log(`Game Contract created at ${gameContract.address} for sessionId ${sessionId}`);
            game.contractAddresses.game = gameContract.address;
            await game.save();

            const tokenContract = await TokenContract.deploy(keyStore);
            // store tokenContract.address for session
            console.log(`Token Contract created at ${tokenContract.address} for sessionId ${sessionId}`);
            game.contractAddresses.token = tokenContract.address;
            await game.save();

            return {
                game: gameContract,
                token: tokenContract
            };

        } catch(err) {
            console.error(err);
            this.deleteGame(sessionId);
        }
        return undefined;
    }

    async deleteGame(sessionId: string) {
        await Game.remove({sessionId: sessionId});
        console.log(`Game with sessionId ${sessionId} has been deleted`);
    }

    checkGameIsCreated(game: IGame) {
        if (game.contractAddresses.game
            && game.contractAddresses.token)
        {
            console.log(`Game with sessionId ${game.sessionId} is now created`)
            game.status = 'created';
        }
    }

    async load(sessionId: string): Promise<IGame> {
        return new Promise(async (resolve, reject) => {
            try {
                const game = await Game.findOne({sessionId: sessionId});
                if (!game) {
                    throw new Error('Unable to find Game with sessionId=' + sessionId);
                }
                // const keyStore = await tezosService.getAccount(originator);
                // get gameContract address for session
                // const gameContract = await GameContract.retrieve(game.contractAddresses.game);
                // get tokenContract.address for session
                // const tokenContract = await TokenContract.retrieve(game.contractAddresses.token);
                resolve(game);
            } catch (err) {
                reject(err);
            }
        });
    }

    async getAll(): Promise<IGame[]> {
        return await Game.find();
    }
}

export const gameService = new GameService();