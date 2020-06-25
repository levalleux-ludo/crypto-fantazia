import { AbstractContract } from "./abstract.contract";
import { MichelsonMap, createOriginationOperation, Tezos, ContractAbstraction, ContractMethod, ContractProvider } from "@taquito/taquito";
import {InMemorySigner} from '@taquito/signer';

import gameContract from './game.contract.json';
import { KeyStore } from "conseiljs";
import { tezosService } from "./tezos.service";
import { sign } from "crypto";
import { TransactionOperation } from "@taquito/taquito/dist/types/operations/transaction-operation";
import { AssetsContract, IAssetParams } from "./assets.contract";
import { MichelsonV1Expression } from '@taquito/rpc';
import { IChanceParams } from "./chance.contract";
import { BigNumber } from "bignumber.js";

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
    immunized: string[];
    nbSpaces: number
    playerPositions: MichelsonMap<string, number>;
    quarantineSpaceId: number;
    lapIncome: number;
    nbLaps: number;
    quarantinePlayers: MichelsonMap<string, number>;
    balances: MichelsonMap<string, {approvals: any, balance: number}>;
    totalSupply: number,
    chances: MichelsonMap<number, any>;
    community_chests: MichelsonMap<number, any>;
    assets: MichelsonMap<number, any>;
    ownership: MichelsonMap<number, string>;
    portfolio: MichelsonMap<string, BigNumber[]>;
    features: MichelsonMap<number, string>;
    counter: number;
}

export class GameContract extends AbstractContract<GameContractStorage> {
    public static async deploy(keyStore: KeyStore, creator_address: string, assets: IAssetParams[], chances: IChanceParams[], community_chests: IChanceParams[]): Promise<GameContract> {
        const address = await tezosService.deployContract(
            JSON.stringify(gameContract),
            JSON.stringify(this.getInitialStorage(keyStore, creator_address, assets, chances, community_chests)),
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
    public static payloadFormat: MichelsonV1Expression = {
      "prim": "pair",
      "args": [{
              "prim": "pair",
              "args": [
                  { "prim": "nat", "annots": ["%assetId"] },
                  { "prim": "pair", "args": [{ "prim": "nat", "annots": ["%cardId"] }, { "prim": "int", "annots": ["%dice1"] }] }
              ]
          },
          {
              "prim": "pair",
              "args": [
                  { "prim": "int", "annots": ["%dice2"] },
                  {
                      "prim": "pair",
                      "args": [
                          { "prim": "int", "annots": ["%newPosition"] },
                          { "prim": "set", "args": [{ "prim": "string" }], "annots": ["%options"] }
                      ]
                  }
              ]
          }
      ]
    };
    protected static getInitialStorage(originator: KeyStore, creator: string, assets: IAssetParams[], chances: IChanceParams[], community_chests: IChanceParams[]) {
      const cardDescription = (card: IChanceParams) => {
        return { "prim": "Elt", "args": [ { "int": card.id.toFixed(0) }, { "prim": "Pair", "args": [ { "int": card.param.toString() }, { "string": card.type } ] } ] };
      }
      const assetDescription = (assetId: number, type: string, price: number, featurePrice: number, rentRates: number[]) => {
        return {
            "prim": "Elt",
            "args": [
              { "int": assetId.toFixed(0) },
              {
                "prim": "Pair",
                "args": [
                  { "prim": "Pair", "args": [ { "int": assetId.toFixed(0) }, { "string": type } ] },
                  {
                    "prim": "Pair",
                    "args": [
                      { "int": featurePrice.toString() },
                      { "prim": "Pair", "args": [ { "int": price.toString() }, [ { "int": rentRates[0].toString() }, { "int": rentRates[1].toString() }, { "int": rentRates[2].toString() }, { "int": rentRates[3].toString() }, { "int": rentRates[4].toString() } ] ] }
                    ]
                  }
                ]
              }
            ]
          };
      }
      const allChances = [];
      for (const card of chances) {
        allChances.push(cardDescription(card));
      }
      const allCChests = [];
      for (const card of community_chests) {
        allCChests.push(cardDescription(card));
      }
      const allAssets = [];
      for (const asset of assets) {
        if (asset.rentRates.length === 0) {
          if (asset.featurePrice !== 0) {
            throw new Error('Was expecting some rentRates set for asset with id ' + asset.assetId);
          }
          asset.rentRates = [0, 0, 0, 0, 0];
        }
        if (asset.rentRates.length != 5) {
          throw new Error('Was expecting 5 elements in rentRates set for asset with id ' + asset.assetId);
        }
        allAssets.push(assetDescription(
            asset.assetId,
            asset.type,
            asset.price,
            asset.featurePrice,
            asset.rentRates
        ));
      }
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
                      {
                        "prim": "Pair",
                        "args": [
                            allAssets,
                          []
                        ]
                      }
                    ]
                  },
                  {
                    "prim": "Pair",
                    "args": [
                      [],
                      {
                        "prim": "Pair",
                        "args": [
                          allChances,
                          allCChests
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                "prim": "Pair",
                "args": [
                  { "prim": "Pair", "args": [ { "int": "0" }, { "prim": "Pair", "args": [ { "string": creator }, [] ] } ] },
                  { "prim": "Pair", "args": [ [], { "prim": "Pair", "args": [ { "int": "200" }, { "int": "0" } ] } ] }
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
                  { "prim": "Pair", "args": [ { "int": "24" }, { "prim": "Pair", "args": [ { "string": originator.publicKeyHash }, { "int": "-1" } ] } ] },
                  { "prim": "Pair", "args": [ { "string": originator.publicKey }, { "prim": "Pair", "args": [ [], [] ] } ] }
                ]
              },
              {
                "prim": "Pair",
                "args": [
                  { "prim": "Pair", "args": [ [], { "prim": "Pair", "args": [ [], [] ] } ] },
                  { "prim": "Pair", "args": [ { "prim": "Pair", "args": [ [], { "int": "12" } ] }, { "prim": "Pair", "args": [ { "string": "created" }, { "int": "0" } ] } ] }
                ]
              }
            ]
          }
        ]
      };
    }
    
    async register(keyStore: KeyStore): Promise<{txHash: string, onConfirmed: Promise<number>}> {
        const operationName = 'register';
        const operation:(ci: ContractAbstraction<ContractProvider>) => ((...args: any[]) => ContractMethod<ContractProvider>)
         = (ci: any) => ci.methods.register;
        const callParams = { fee: 400000, gasLimit: 1000000, storageLimit: 20000 };
        return this.callMethodTaquito(keyStore, operationName, callParams, operation);
    }


    async start(keyStore: KeyStore, initialBalance: number): Promise<{txHash: string, onConfirmed: Promise<number>}> {
        const operationName = 'start';
        Tezos.setProvider({ signer: new InMemorySigner(keyStore.privateKey) });
        return new Promise((resolve, reject) => {
            Tezos.contract.at(this._address).then((ci) => {
                try {
                    ci.methods.start(initialBalance).send({ fee: 400000, gasLimit: 800000, storageLimit: 20000 }).then((txOperation: TransactionOperation) => {
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
      return new Promise<{txHash: string, onConfirmed: Promise<number>}>((resolve, reject) => {
        const operationName = 'reset_start';
        const operation:(ci: ContractAbstraction<ContractProvider>) => ((...args: any[]) => ContractMethod<ContractProvider>)
         = (ci: any) => ci.methods.reset_start;
         this.callMethodTaquito(keyStore, operationName, { fee: 400000, gasLimit: 900000, storageLimit: 20000 }, operation)
         .then(operationResult => {
           operationResult.onConfirmed.then(() => {
                const operationName2 = 'reset_complete';
                const operation2:(ci: ContractAbstraction<ContractProvider>) => ((...args: any[]) => ContractMethod<ContractProvider>)
                  = (ci: any) => ci.methods.reset_start;
                  resolve(this.callMethodTaquito(keyStore, operationName2, { fee: 400000, gasLimit: 900000, storageLimit: 20000 }, operation2));
              }).catch(err => reject(err));
          }).catch(err => reject(err));
      });
    }

    async reset_complete(keyStore: KeyStore): Promise<{txHash: string, onConfirmed: Promise<number>}> {
      const operationName = 'reset_complete';
      const operation:(ci: ContractAbstraction<ContractProvider>) => ((...args: any[]) => ContractMethod<ContractProvider>)
       = (ci: any) => ci.methods.reset_complete;
       return this.callMethodTaquito(keyStore, operationName, { fee: 400000, gasLimit: 900000, storageLimit: 20000 }, operation);
    }

    // async play(keyStore: KeyStore, option: string, payload: any, signature: string): Promise<void> {
    //     return tezosService.invokeContract(
    //       keyStore,
    //       this._address,
    //       'play',
    //       [
    //         `"${option}"`,
    //         payload.assetId,
    //         payload.cardId,
    //         payload.dice1,
    //         payload.dice2,
    //         payload.newPosition,
    //         payload.options.map((an_option: string) => `"${an_option}"`),
    //         signature
    //       ]);
    // }
    async play(keyStore: KeyStore, option: string, payload: any, signature: string): Promise<{txHash: string, onConfirmed: Promise<number>}> {
        const operationName = 'play';
        const operation:(ci: ContractAbstraction<ContractProvider>) => ((...args: any[]) => ContractMethod<ContractProvider>)
         = (ci: any) => ci.methods.play;
         return this.callMethodTaquito(
           keyStore,
           operationName,
           { fee: 800000, gasLimit: 400000, storageLimit: 50000 },
           operation,
           option,
           payload.assetId,
           payload.cardId,
           payload.dice1,
           payload.dice2,
           payload.newPosition,
           payload.options,
           signature);    
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
