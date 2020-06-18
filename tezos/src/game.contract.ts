import { AbstractContract } from "./abstract.contract";
import { MichelsonMap, createOriginationOperation, Tezos, ContractAbstraction, ContractMethod, ContractProvider } from "@taquito/taquito";
import {InMemorySigner} from '@taquito/signer';

import gameContract from './game.contract.json';
import { KeyStore } from "conseiljs";
import { tezosService } from "./tezos.service";
import { sign } from "crypto";
import { TransactionOperation } from "@taquito/taquito/dist/types/operations/transaction-operation";

export interface GameContractStorage {
    admin: string;
    originator_pubKey: string;
    creator: string,
    authorized_contracts: string[]
    players: MichelsonMap<number, string>;
    playersSet: any[];
    status: string;
    nextPlayer: string;
    nextPlayerIdx: number;
    nextDices: number;
    debug: number;
    alreadyRegistered: boolean;
    lastTurnOption: string;
    immunized: string[];
    nbSpaces: number
    playerPositions: MichelsonMap<string, number>;
    quarantineSpaceId: number;
    callToken: boolean;
    lapIncome: number;
    nbLaps: number;
    quarantinePlayers: MichelsonMap<string, number>;
    token: string;
    chance: string;
    community: string;
    assets: string;
    counter: number;
}

export class GameContract extends AbstractContract<GameContractStorage> {
    public static async deploy(keyStore: KeyStore, creator_address: string): Promise<GameContract> {
        const address = await tezosService.deployContract(
            JSON.stringify(gameContract),
            JSON.stringify(this.getInitialStorage(keyStore, creator_address)),
            keyStore
        ).catch(err => {
            console.error('Error during game contract deployment:' + err);
            throw(new Error('Error during game contract deployment:' + err));
        });
        return new GameContract(address);
    }
    public static async retrieve(address: string): Promise<GameContract> {
        // TODO: check if contract is correctly deployed at specified address
        const contract = new GameContract(address);
        await contract.update();
        return contract;
    }
    protected constructor(address: string) {
        super(address);
    }
    protected static getInitialStorage(originator: KeyStore, creator: string) {
        return {
          "prim": "Pair",
          "args": [
            {
              "prim": "Pair",
              "args": [
                {
                  "prim": "Pair",
                  "args": [
                    {
                      "prim": "Pair",
                      "args": [
                        { "string": originator.publicKeyHash },
                        { "prim": "Pair", "args": [ { "prim": "False" }, { "string": originator.publicKeyHash } ] }
                      ]
                    },
                    { "prim": "Pair", "args": [ [], { "prim": "Pair", "args": [ { "prim": "False" }, { "string": originator.publicKeyHash } ] } ] }
                  ]
                },
                {
                  "prim": "Pair",
                  "args": [
                    {
                      "prim": "Pair",
                      "args": [
                        { "string": originator.publicKeyHash },
                        { "prim": "Pair", "args": [ { "int": "0" }, { "string": creator } ] }
                      ]
                    },
                    { "prim": "Pair", "args": [ { "prim": "Pair", "args": [ { "int": "0" }, [] ] }, { "prim": "Pair", "args": [ { "int": "200" }, { "string": "" } ] } ] }
                  ]
                }
              ]
            },
            {
              "prim": "Pair",
              "args": [
                {
                  "prim": "Pair",
                  "args": [
                    { "prim": "Pair", "args": [ { "int": "0" }, { "prim": "Pair", "args": [ { "int": "24" }, { "int": "-1" } ] } ] },
                    {
                      "prim": "Pair",
                      "args": [
                        { "string": originator.publicKeyHash },
                        { "prim": "Pair", "args": [ { "int": "-1" }, { "string": originator.publicKey } ] }
                      ]
                    }
                  ]
                },
                {
                  "prim": "Pair",
                  "args": [
                    { "prim": "Pair", "args": [ [], { "prim": "Pair", "args": [ [], [] ] } ] },
                    {
                      "prim": "Pair",
                      "args": [
                        { "prim": "Pair", "args": [ [], { "int": "12" } ] },
                        { "prim": "Pair", "args": [ { "string": "created" }, { "string": originator.publicKeyHash } ] }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
    }
    
    async register(keyStore: KeyStore): Promise<{txHash: string, onConfirmed: Promise<number>}> {
        const operationName = 'register';
        const operation:(ci: ContractAbstraction<ContractProvider>) => ((...args: any[]) => ContractMethod<ContractProvider>)
         = (ci: any) => ci.methods.register;
        const callParams = { fee: 400000, gasLimit: 400000, storageLimit: 100 };
        return this.callMethodTaquito(keyStore, operationName, callParams, operation);
    }


    async start(keyStore: KeyStore, tokenAddress: string, chanceAddress: string, communityAddress: string, assetsAddress: string, initialBalance: number): Promise<{txHash: string, onConfirmed: Promise<number>}> {
        const operationName = 'start';
        Tezos.setProvider({ signer: new InMemorySigner(keyStore.privateKey) });
        return new Promise((resolve, reject) => {
            Tezos.contract.at(this._address).then((ci) => {
                try {
                    ci.methods.start(assetsAddress, chanceAddress, communityAddress, initialBalance, tokenAddress).send({ fee: 400000, gasLimit: 800000, storageLimit: 20000 }).then((txOperation: TransactionOperation) => {
                        console.log(`returns from ${operationName} call: ${txOperation}`);
                        resolve({
                            txHash: txOperation.hash,
                            onConfirmed: txOperation.confirmation(1, 10, 180)
                        });
                    }).catch(err => {
                        console.error(`Error during ${operationName} call: ${err.id}, ${err.message}`);
                        reject(err);
                    });
                } catch (err) {
                    console.error(`Error during ${operationName} call: ${err.id}, ${err.message}`);
                    reject(err);
                }
            });
        });
    }

    // async start(keyStore: KeyStore, tokenAddress: string, initialBalance: number) {
    //      return tezosService.invokeContract(keyStore, this._address, 'start', [initialBalance, '"' + tokenAddress + '"']);
    // }

    async testCallToken(keyStore: KeyStore, tokenAddress: string) {
        const operationName = 'testCallToken';
        const operation:(ci: ContractAbstraction<ContractProvider>) => ((...args: any[]) => ContractMethod<ContractProvider>)
         = (ci: any) => ci.methods.testCallToken;
         return this.callMethodTaquito(keyStore, operationName, undefined, operation, tokenAddress);        
    }

    async testCallTokenAdminOnly(keyStore: KeyStore, tokenAddress: string) {
        const operationName = 'testCallTokenAdminOnly';
        const operation:(ci: ContractAbstraction<ContractProvider>) => ((...args: any[]) => ContractMethod<ContractProvider>)
         = (ci: any) => ci.methods.testCallTokenAdminOnly;
         return this.callMethodTaquito(keyStore, operationName, undefined, operation, tokenAddress);        
    }

    async end(keyStore: KeyStore): Promise<{txHash: string, onConfirmed: Promise<number>}> {
        const operationName = 'end';
        const operation:(ci: ContractAbstraction<ContractProvider>) => ((...args: any[]) => ContractMethod<ContractProvider>)
         = (ci: any) => ci.methods.end;
        return this.callMethodTaquito(keyStore, operationName, undefined, operation);
    }

    async freeze(keyStore: KeyStore): Promise<{txHash: string, onConfirmed: Promise<number>}> {
        const operationName = 'freeze';
        const operation:(ci: ContractAbstraction<ContractProvider>) => ((...args: any[]) => ContractMethod<ContractProvider>)
         = (ci: any) => ci.methods.freeze;
         return this.callMethodTaquito(keyStore, operationName, undefined, operation);
    }

    async resume(keyStore: KeyStore): Promise<{txHash: string, onConfirmed: Promise<number>}> {
        const operationName = 'resume';
        const operation:(ci: ContractAbstraction<ContractProvider>) => ((...args: any[]) => ContractMethod<ContractProvider>)
         = (ci: any) => ci.methods.resume;
         return this.callMethodTaquito(keyStore, operationName, undefined, operation);
    }

    async reset(keyStore: KeyStore): Promise<{txHash: string, onConfirmed: Promise<number>}> {
        const operationName = 'reset';
        const operation:(ci: ContractAbstraction<ContractProvider>) => ((...args: any[]) => ContractMethod<ContractProvider>)
         = (ci: any) => ci.methods.reset;
         return this.callMethodTaquito(keyStore, operationName, { fee: 400000, gasLimit: 900000, storageLimit: 20000 }, operation);
    }

    async play(keyStore: KeyStore) {
        return tezosService.invokeContract(keyStore, this._address, 'play', []);
    }

    async setInitialBalances(keyStore: KeyStore) {
        const operationName = 'setInitialBalances';
        const operation:(ci: ContractAbstraction<ContractProvider>) => ((...args: any[]) => ContractMethod<ContractProvider>)
         = (ci: any) => ci.methods.resume;
         return this.callMethodTaquito(keyStore, operationName, undefined, operation);
    }

    async isRegistered(account: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (!this.isWatching) {
                this.update().then(() => {
                    const isRegistered = this.storage?.playersSet.includes(account);
                    resolve(isRegistered);
                }).catch(err => reject(err));
            } else {
                const isRegistered = this.storage?.playersSet.includes(account);
                resolve(isRegistered);
            }
        });
    }

    async getStatus(): Promise<string | undefined> {
        if (!this.isWatching) await this.update();
        return this.storage?.status;
    }

    async getNextPlayer(): Promise<string | undefined> {
        if (!this.isWatching) await this.update();
        return this.storage?.nextPlayer;
    }

    async getPlayers(): Promise<string[] | undefined> {
        if (!this.isWatching) await this.update();
        return this.storage?.playersSet;
    }

    async getCreator(): Promise<string | undefined> {
        if (!this.isWatching) await this.update();
        return this.storage?.creator;
    }
}
