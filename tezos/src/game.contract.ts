import { AbstractContract } from "./abstract.contract";
import { MichelsonMap, createOriginationOperation, Tezos, ContractAbstraction, ContractMethod, ContractProvider } from "@taquito/taquito";
import {InMemorySigner} from '@taquito/signer';

import gameContract from './game.contract.json';
import { KeyStore } from "conseiljs";
import { tezosService } from "./tezos.service";
import { sign } from "crypto";
import { TransactionOperation } from "@taquito/taquito/dist/types/operations/transaction-operation";

export interface GameContractStorage {
    originator_address: string;
    originator_pubKey: string;
    creator: string
    players: MichelsonMap<number, string>;
    playersSet: any[];
    status: string;
    nextPlayer: string;
    nextPlayerIdx: number;
    nextDices: number;
    debug: number;
    alreadyRegistered: boolean;
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
                  { "prim": "Pair", "args": [ { "prim": "False" }, { "prim": "Pair", "args": [ { "int": "0" }, { "string": creator } ] } ] },
                  { "prim": "Pair", "args": [ { "int": "0" }, { "prim": "Pair", "args": [ { "int": "-1" }, { "string": originator.publicKeyHash } ] } ] }
                ]
              },
              {
                "prim": "Pair",
                "args": [
                  {
                    "prim": "Pair",
                    "args": [
                      { "int": "-1" },
                      { "prim": "Pair", "args": [ { "string": originator.publicKeyHash }, { "string": originator.publicKey } ] }
                    ]
                  },
                  { "prim": "Pair", "args": [ [], { "prim": "Pair", "args": [ [], { "string": "created" } ] } ] }
                ]
              }
            ]
        }
    };
    
    async register(keyStore: KeyStore, random: number, signature: string): Promise<{txHash: string, onConfirmed: Promise<number>}> {
        const fake_signature = await tezosService.make_signature(Buffer.from(signature), keyStore.privateKey);
        const operationName = 'register';
        const operation:(ci: ContractAbstraction<ContractProvider>) => ((...args: any[]) => ContractMethod<ContractProvider>)
         = (ci: any) => ci.methods.register;
        const callParams = { fee: 400000, gasLimit: 400000, storageLimit: 100 };
        return this.callMethodTaquito(keyStore, operationName, callParams, operation, random, fake_signature);
    }

    async callMethodTaquito(
        keyStore: KeyStore,
        operationName: string,
        callParams: any | undefined,
        operation: (ci: ContractAbstraction<ContractProvider>) => ((...args: any[]) => ContractMethod<ContractProvider>),
        ...args: any[]
    ): Promise<{txHash: string, onConfirmed: Promise<number>}> {
        Tezos.setProvider({ signer: new InMemorySigner(keyStore.privateKey) });
        return new Promise((resolve, reject) => {
            Tezos.contract.at(this._address).then((ci) => {
                try {
                    let method = args.length === 0 ? operation(ci)(null)
                     : args.length === 1 ? operation(ci)(args[0])
                     : args.length === 2 ? operation(ci)(args[0], args[1])
                     : args.length === 3 ? operation(ci)(args[0], args[1], args[2])
                     : undefined;
                     if (!method) {
                         throw new Error('Too many parameters: ' + args);
                     }

                    method.send(callParams).then((txOperation: TransactionOperation) => {
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

    async start(keyStore: KeyStore, tokenAddress: string, initialBalance: number): Promise<{txHash: string, onConfirmed: Promise<number>}> {
        const operationName = 'start';
        Tezos.setProvider({ signer: new InMemorySigner(keyStore.privateKey) });
        return new Promise((resolve, reject) => {
            Tezos.contract.at(this._address).then((ci) => {
                try {
                    ci.methods.start(initialBalance, tokenAddress).send({ fee: 400000, gasLimit: 400000, storageLimit: 200 }).then((txOperation: TransactionOperation) => {
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