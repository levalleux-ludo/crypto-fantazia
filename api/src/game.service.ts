import { v4 as uuid } from 'uuid';
import { tezosService } from '../../tezos/src/tezos.service'
import { originator } from '../../tezos/src/token.service'
import { GameContract } from '../../tezos/src/game.contract';
import { TokenContract } from '../../tezos/src/token.contract';
import Game, { IGame } from './db/game.model';
import { resolve } from 'dns';
import { KeyStore } from '../../tezos/node_modules/conseiljs/dist';
import { turnService } from './turn.service';
import { sseService, eEventType } from './sse.service';
import { spaceService } from './space.service';
import { eSpaceType } from './db/space.model';

export const GameConfig = {
    nbSpaces: 24,
    nbChancesOrCC: 48
}

export enum ePlayOption {
    NOTHING, // do nothing
    GENESIS, // receive income
    COVID, // go to quarantine
    STARTUP_FOUND, // found startup
    BUY_PRODUCT, // but product from startup
    CHANCE, // get a chance card
    COMMUNITY_CHEST // get a community_chest card
}

class GameService {

    currentPlayer: string | undefined;

    async create(creator: string, createContract = true): Promise<IGame> {
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
                if (createContract) {
                    this.createContracts(keyStore, sessionId, creator).then(async (contracts) => {
                        game.status = 'created';
                        await game.save();
                    });
                }
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

            const tokenContract = await TokenContract.deploy(keyStore, gameContract.address);
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

    async startSession(sessionId: string): Promise<{txHash: string}> {
        const game = await Game.findOne({sessionId: sessionId});
        if (!game) {
            throw new Error('Unable to find Game with sessionId=' + sessionId);
        }
        const keyStore = await tezosService.getAccount(originator);
        const gameContract = await GameContract.retrieve(game.contractAddresses.game);
        // const opResult = await gameContract.start(keyStore, game.contractAddresses.token, 1500);
        // console.log(`START GAME requested: txHash:${opResult.txHash} ...`);
        // opResult.onConfirmed.then((blockId) => {
        const txOper = await gameContract.start(keyStore, game.contractAddresses.token, 1500).catch(err => {
            console.error(`Error during start call: ${err.id}, ${err.message}`);
            throw new Error(`[ERROR] START GAME request failed with error: ${err}`);
        });
        console.log('returns from start call:' + txOper.txHash);
        txOper.onConfirmed.then((blockId) => {
            console.log('Tx confirmed', txOper.txHash, blockId);
            console.log(`START GAME request succeed`);
        }).catch(err => {
            console.log(`[ERROR] START GAME request failed with error: ${err}`);
            throw new Error(`[ERROR] START GAME request failed with error: ${err}`);
        });
        game.status = 'started';
        await gameContract.update().then(storage => {
            game.players = Array.from(storage.players.values());
            for (let player of game.players) {
                game.positions.set(player, 0);
            }
        })
        await game.save();
        return {txHash: txOper.txHash};
    }

    async resetSession(sessionId: string): Promise<{txHash: string}> {
        const game = await Game.findOne({sessionId: sessionId});
        if (!game) {
            throw new Error('Unable to find Game with sessionId=' + sessionId);
        }
        const keyStore = await tezosService.getAccount(originator);
        const gameContract = await GameContract.retrieve(game.contractAddresses.game);
        // const opResult = await gameContract.start(keyStore, game.contractAddresses.token, 1500);
        // console.log(`START GAME requested: txHash:${opResult.txHash} ...`);
        // opResult.onConfirmed.then((blockId) => {
        const txOper = await gameContract.reset(keyStore, game.contractAddresses.token).catch(err => {
            console.error(`Error during reset call: ${err.id}, ${err.message}`);
            throw new Error(`[ERROR] RESET GAME request failed with error: ${err}`);
        });
        console.log('returns from reset call:' + txOper.txHash);
        txOper.onConfirmed.then((blockId) => {
            console.log('Tx confirmed', txOper.txHash, blockId);
            console.log(`RESET GAME request succeed`);
        }).catch(err => {
            console.log(`[ERROR] RESET GAME request failed with error: ${err}`);
            throw new Error(`[ERROR] RESET GAME request failed with error: ${err}`);
        });
        game.status = 'created';
        game.players = [];
        await game.save();
        return {txHash: txOper.txHash};
    }

    async rollDices(sessionId: string, player: string): Promise<any> {
        const game = await Game.findOne({sessionId: sessionId});
        if (!game) {
            throw new Error('Unable to find Game with sessionId=' + sessionId);
        }
        if (game.status != 'started') {
            throw new Error('Can not play game with status =' + game.status);
        }
        if (!game.positions.has(player)) {
            throw new Error('Can not find position of player =' + player);
        }
        if (!game.contractAddresses.game) {
            throw new Error('GameContract address is not set');
        }
        const gameContract = await GameContract.retrieve(game.contractAddresses.game);
        if (!gameContract) {
            throw new Error('Unable to retrieve GameContract from address ' + game.contractAddresses.game);
        }
        if (gameContract.storage?.nextPlayer !== player) {
            throw new Error(`Player ${player} is not allowed to play now (expected player: ${gameContract.storage?.nextPlayer})`);
        }
        if (this.currentPlayer === player) {
            throw new Error(`Player ${player} is already playing`);
        }

        const oldPosition = game.positions.get(player) as any;
        // TODO: check oldPosition is the same is GameContract and in DB
        // if (gameContract.storage.positions.get(player) !== oldPosition) {
            // throw new Error(`Not consistent position for player ${player}: position in DB: ${oldPosition}, position in smart contract: ${gameContract.storage.positions.get(player)}`);
        // }
        this.currentPlayer = player;

        const dice1 = 1 + Math.floor(6 * Math.random());
        const dice2 = 1 + Math.floor(6 * Math.random());
        const cardId = Math.floor(GameConfig.nbChancesOrCC * Math.random());
        const newPosition = (oldPosition + dice1 + dice2) % GameConfig.nbSpaces;
        console.log(`Roll the dices player ${player}: D1:${dice1}, D2:${dice2} => new Position: ${newPosition}`);
        const options = await this.getAvailableOptions(this.currentPlayer, oldPosition, newPosition);
        const payload = {
            dice1: dice1,
            dice2: dice2,
            newPosition: newPosition,
            cardId: cardId,
            options: options, // The smart contract will verify that the chose option is in the list
            assetId: newPosition // by simplicity, we use the spaceId as assetId
        }
        const keyStore = await tezosService.getAccount(originator);
        const signature = await tezosService.make_signature(Buffer.from(JSON.stringify(payload)), keyStore.privateKey);
        game.positions.set(player, newPosition);
        const turn = await turnService.create(
            sessionId,
            player,
            oldPosition,
            newPosition,
            [dice1, dice2],
            cardId,
            signature);
        game.turns.push(turn.id);
        await game.save();
        // and update position in contract ?

        // sseService.send (sessionId, player, newPosition, [dice1, dice2], cardId)
        sseService.notify(sessionId, eEventType.TURN_STARTED, {
            player,
            dices: [dice1, dice2],
            newPosition: newPosition,
            cardId: cardId,
            signature
        });

        // Le joueur J recoit le payload et la signature
        // La mise a jour de la position de J dans la DB est detectee par tous les joueurs qui mettent 
        // a jour le plateau de jeu (nouvelle position de J)
        // On stocke aussi le(s) cardId dans la DB, ainsi les joueurs peuvent afficher la description de la 
        // case sur laquelle J est tombé (à partir de sa position et cardId si chance ou cc)
        
        // Le joueur J fait son choix (le cas echeant)
        // puis il envoie la tx Play() au gamecontrat
        // NOTE: la signature et le payload sont envoyes au GameContract dans la Tx play()
        // Le contract peut alors verifier la nouvelle position du joueur et sa cardId et executer
        // le contrat correspondant avec les options choisies
        return { payload, signature };
    }

    async getAvailableOptions(player: string, oldPosition: number, newPosition: number): Promise<ePlayOption[]> {
        const spaceDetails = await spaceService.getBySpaceId(newPosition);
        if (spaceDetails === null) {
            throw new Error(`Unable to compute options for space with id ${newPosition}`);
        }
        const options = [];
        if (newPosition < oldPosition) {
            // means that we've passed through Genesis Block
            options.push(ePlayOption.GENESIS);
        }
        switch (spaceDetails.type) {
            case eSpaceType.GENESIS:
            case eSpaceType.QUARANTINE: {
                options.push(ePlayOption.NOTHING);
                break;
            }
            case eSpaceType.COVID: {
                options.push(ePlayOption.COVID);
                break;
            }
            case eSpaceType.CHANCE: {
                options.push(ePlayOption.CHANCE);
                break;
            }
            case eSpaceType.COMMUNITY: {
                options.push(ePlayOption.COMMUNITY_CHEST);
                break;
            }
            default: { // Assets
                // TODO: check if the asset already owns to a player and if a different player
                // already owned and same player -> options.push(ePlayOption.NOTHING);
                // already owned and different player -> options.push(ePlayOption.BUY_PRODUCT);
                // not already owned
                options.push(ePlayOption.STARTUP_FOUND);
                options.push(ePlayOption.NOTHING);
                break;
            }
        }

    }
}

export const gameService = new GameService();