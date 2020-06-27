import { v4 as uuid } from 'uuid';
import { BigNumber } from 'bignumber.js';
import { tezosService } from '../../tezos/src/tezos.service'
import { originator } from '../../tezos/src/token.service'
import { GameContract } from '../../tezos/src/game.contract';
import { TokenContract } from '../../tezos/src/token.contract';
import { ChanceContract } from '../../tezos/src/chance.contract';
import { AssetsContract } from '../../tezos/src/assets.contract';
import Game, { IGame } from './db/game.model';
import { resolve } from 'dns';
import { KeyStore } from '../../tezos/node_modules/conseiljs/dist';
import { turnService } from './turn.service';
import { sseService, eEventType } from './sse.service';
import { spaceService } from './space.service';
import { eSpaceType } from './db/space.model';
import { cardService, eCardType } from './card.service';
import { isString } from 'util';

export const GameConfig = {
    nbSpaces: 24,
    nbChancesOrCC: 15
}

export enum ePlayOption {
    NOTHING = 'NOTHING', // do nothing
    GENESIS = 'GENESIS', // receive income
    COVID = 'COVID', // go to quarantine
    STARTUP_FOUND = 'STARTUP_FOUND', // found startup
    BUY_PRODUCT = 'BUY_PRODUCT', // but product from startup
    CHANCE = 'CHANCE', // get a chance card
    COMMUNITY_CHEST = 'COMMUNITY_CHEST' // get a community_chest card
}

class GameService {

    currentPlayer = new Map<string, string | undefined>();

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
                    }).catch(err => {
                        sseService.notify(sessionId, eEventType.FATAL_ERROR, (typeof err === 'string') ? err : (err.message) ? err.message : JSON.stringify(err));
                        reject(err);
                    })
                }
                sseService.notify(sessionId, eEventType.GAME_CREATION, `Game session successfully created.`);
                resolve(game);
            } catch (err) {
                reject(err)
            }
        });
    }

    async createContracts(keyStore: KeyStore, sessionId: string, creator: string): Promise<{game: GameContract, token: TokenContract} | undefined> {
        try {

            const chances = (await cardService.getAll(eCardType.CHANCE)).map(
                cardDetail => {
                    let param;
                    switch(cardDetail.impl) {
                        case 'move_n_spaces': {
                            param = parseInt(cardDetail.properties.get('nb') as string);
                            break;
                        }
                        case 'go_to_space': {
                            param = parseInt(cardDetail.properties.get('space') as string);
                            break;
                        }
                        case 'receive_amount':
                        case 'pay_amount':
                        case 'pay_amount_per_company':
                        case 'pay_amount_per_mining_farm':
                        case 'pay_amount_per_bakery': {
                            param = parseInt(cardDetail.properties.get('amount') as string);
                            break;
                        }
                        default: {
                            param = 0;
                            break;
                        }
                    }
                    return {id: cardDetail.cardId, type: cardDetail.impl, param: param};
                }
            );

            const game = await Game.findOne({sessionId: sessionId});
            let numContract = 0;
            const nbContracts = 5;
            if (!game) throw new Error('Unable to find the game with sessionId ' + sessionId);

            const gameContract = await GameContract.deploy(keyStore, creator);
            // store gameContract.address for session
            console.log(`Game Contract created at ${gameContract.address} for sessionId ${sessionId}`);
            game.contractAddresses.game = gameContract.address;
            await game.save();
            sseService.notify(sessionId, eEventType.GAME_CREATION, `Contract #${++numContract}/${nbContracts} deployed at ${gameContract.address}. Creating still in progress...`);

            const tokenContract = await TokenContract.deploy(keyStore, gameContract.address);
            // store tokenContract.address for session
            console.log(`Token Contract created at ${tokenContract.address} for sessionId ${sessionId}`);
            game.contractAddresses.token = tokenContract.address;
            await game.save();
            sseService.notify(sessionId, eEventType.GAME_CREATION, `Contract #${++numContract}/${nbContracts} deployed at ${tokenContract.address}. Creating still in progress...`);

            const chanceContract = await ChanceContract.deploy(
                keyStore,
                gameContract.address,
                gameContract.address,
                chances
            );
            // store chanceContract.address for session
            console.log(`Chance Contract created at ${chanceContract.address} for sessionId ${sessionId}`);
            game.contractAddresses.chance = chanceContract.address;
            await game.save();
            sseService.notify(sessionId, eEventType.GAME_CREATION, `Contract #${++numContract}/${nbContracts} deployed at ${chanceContract.address}. Creating still in progress...`);

            const communityChests = (await cardService.getAll(eCardType.COMMUNITY_CHEST)).map(
                cardDetail => {
                    let param;
                    switch(cardDetail.impl) {
                        case 'move_n_spaces': {
                            param = parseInt(cardDetail.properties.get('nb') as string);
                            break;
                        }
                        case 'go_to_space': {
                            param = parseInt(cardDetail.properties.get('space') as string);
                            break;
                        }
                        case 'receive_amount':
                        case 'pay_amount':
                        case 'pay_amount_per_company':
                        case 'pay_amount_per_mining_farm':
                        case 'pay_amount_per_bakery': {
                            param = parseInt(cardDetail.properties.get('amount') as string);
                            break;
                        }
                        default: {
                            param = 0;
                            break;
                        }
                    }
                    return {id: cardDetail.cardId, type: cardDetail.impl, param: param};
                }
            );
            const communityContract = await ChanceContract.deploy(
                keyStore,
                gameContract.address,
                gameContract.address,
                communityChests
            );
            // store communityContract.address for session
            console.log(`Community Contract created at ${communityContract.address} for sessionId ${sessionId}`);
            game.contractAddresses.community = communityContract.address;
            await game.save();
            sseService.notify(sessionId, eEventType.GAME_CREATION, `Contract #${++numContract}/${nbContracts} deployed at ${communityContract.address}. Creating still in progress...`);

            const assets = (await spaceService.getAll()).filter(
                space => (space.type == eSpaceType.BAKERY) || (space.type == eSpaceType.MINING_FARM)
                || (space.type == eSpaceType.MARKETPLACE) || (space.type == eSpaceType.EXCHANGE)
                || (space.type == eSpaceType.STARTUP)
            ).map(space => {
                return {assetId: space.spaceId, type: space.type, price: space.price, featurePrice: space.featureCost, rentRates: space.rentRates};
            });
            const assetsContract = await AssetsContract.deploy(
                keyStore,
                keyStore.publicKeyHash, // dont set game contract as admin because we need originator being able to call 'reset' entry-point 
                gameContract.address,
                assets
            );
            // store assetsContract.address for session
            console.log(`Assets Contract created at ${assetsContract.address} for sessionId ${sessionId}`);
            game.contractAddresses.assets = assetsContract.address;
            await game.save();
            sseService.notify(sessionId, eEventType.GAME_CREATION, `Contract #${++numContract}/${nbContracts} deployed at ${assetsContract.address}. Creating still in progress...`);



            return {
                game: gameContract,
                token: tokenContract
            };

        } catch(err) {
            // console.error(err);
            this.deleteGame(sessionId);
            throw err;
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
        this.currentPlayer.set(sessionId, undefined);
        const game = await Game.findOne({sessionId: sessionId});
        if (!game) {
            throw new Error('Unable to find Game with sessionId=' + sessionId);
        }
        const keyStore = await tezosService.getAccount(originator);
        const gameContract = await GameContract.retrieve(game.contractAddresses.game);
        // const opResult = await gameContract.start(keyStore, game.contractAddresses.token, 1500);
        // console.log(`START GAME requested: txHash:${opResult.txHash} ...`);
        // opResult.onConfirmed.then((blockId) => {
        const txOper = await gameContract.start(
            keyStore,
            game.contractAddresses.token,
            game.contractAddresses.chance,
            game.contractAddresses.community,
            game.contractAddresses.assets,
            1500).catch(err => {
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
                game.positions.set(player, storage.playerPositions.has(player) ? storage.playerPositions.get(player) as number : 0);
            }
        })
        await game.save();
        return {txHash: txOper.txHash};
    }

    async resetSession(sessionId: string): Promise<{txHash: string}> {
        this.currentPlayer.set(sessionId, undefined);
        const game = await Game.findOne({sessionId: sessionId});
        if (!game) {
            throw new Error('Unable to find Game with sessionId=' + sessionId);
        }
        const keyStore = await tezosService.getAccount(originator);
        const gameContract = await GameContract.retrieve(game.contractAddresses.game);
        // const opResult = await gameContract.start(keyStore, game.contractAddresses.token, 1500);
        // console.log(`START GAME requested: txHash:${opResult.txHash} ...`);
        // opResult.onConfirmed.then((blockId) => {
        const txOper = await gameContract.reset(keyStore).catch(err => {
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
        if (this.currentPlayer.get(sessionId) === player) {
            throw new Error(`Player ${player} is already playing`);
        }

        let oldPosition = game.positions.get(player) as any;
        // check oldPosition is the same is GameContract and in DB
        if ((gameContract.storage.playerPositions.get(player) as unknown as BigNumber).toNumber() !== oldPosition) {
            console.warn(`Not consistent position for player ${player}: position in DB: ${oldPosition}, position in smart contract: ${gameContract.storage.playerPositions.get(player)}`);
            oldPosition = (gameContract.storage.playerPositions.get(player) as unknown as BigNumber).toNumber();
            game.positions.set(player, oldPosition);
        }
        this.currentPlayer.set(sessionId, player);

        const dice1 = 1 + Math.floor(6 * Math.random());
        const dice2 = 1 + Math.floor(6 * Math.random());
        const cardId = Math.floor(GameConfig.nbChancesOrCC * Math.random());
        const newPosition = (oldPosition + dice1 + dice2) % GameConfig.nbSpaces;
        console.log(`Roll the dices player ${player}: D1:${dice1}, D2:${dice2} => new Position: ${newPosition}`);
        const options = await this.getAvailableOptions(player, oldPosition, newPosition);
        const payload = {
            dice1: dice1,
            dice2: dice2,
            newPosition: newPosition,
            cardId: cardId,
            options: options, // The smart contract will verify that the chose option is in the list
            assetId: newPosition // by simplicity, we use the spaceId as assetId
        }
        const keyStore = await tezosService.getAccount(originator);
        const thingsToSign = await tezosService.packData2(GameContract.payloadFormat, payload);
        const signature = await tezosService.make_signature(thingsToSign, keyStore.privateKey);
        game.positions.set(player, newPosition);
        // const turn = await turnService.create(
        //     sessionId,
        //     player,
        //     oldPosition,
        //     newPosition,
        //     [dice1, dice2],
        //     cardId,
        //     signature);
        // game.turns.push(turn.id);
        await game.save();
        // and update position in contract ?

        // sseService.send (sessionId, player, newPosition, [dice1, dice2], cardId)
        sseService.notify(sessionId, eEventType.TURN_STARTED, {
            player,
            dices: [dice1, dice2],
            newPosition: newPosition,
            oldPosition: oldPosition,
            cardId: cardId,
            options: options,
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

    async played(sessionId: string, player: string, payload: any, signature: string) {
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
        if (this.currentPlayer.get(sessionId) !== player) {
            throw new Error(`Player ${player} is not allowed to play now (expected player: ${this.currentPlayer.get(sessionId)})`);
        }
        if (gameContract.storage?.nextPlayer === player) {
            // in case the 'play' transaction failed, we need to update playerPosition and nextPlayer in game contract to allow the game to continue
            console.log("I need to call contract to restore consistent player position");
            const keyStore = await tezosService.getAccount(originator);

            const txOper = await gameContract.force_next_player(keyStore, player, payload.newPosition).catch(err => {
                console.error(`Error during force_next_player call: ${err.id}, ${err.message}`);
                throw new Error(`[ERROR] force_next_player request failed with error: ${err}`);
            });
            console.log('returns from force_next_player call:' + txOper.txHash);
            txOper.onConfirmed.then((blockId) => {
                console.log('Tx confirmed', txOper.txHash, blockId);
                console.log(`force_next_player request succeed`);
            }).catch(err => {
                console.log(`[ERROR] force_next_player request failed with error: ${err}`);
                throw new Error(`[ERROR] force_next_player request failed with error: ${err}`);
            });
        }
        return {};
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
        return options;
    }
}

export const gameService = new GameService();