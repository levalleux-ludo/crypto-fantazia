import { AbstractContract } from "./abstract.contract";
import { MichelsonMap, createOriginationOperation, Tezos, ContractAbstraction, ContractMethod, ContractProvider } from "@taquito/taquito";
import {InMemorySigner} from '@taquito/signer';

import gameContract from './game.contract.json';
import { KeyStore } from "conseiljs";
import { tezosService } from "./tezos.service";
import { sign } from "crypto";
import { TransactionOperation } from "@taquito/taquito/dist/types/operations/transaction-operation";
import { AssetsContract } from "./assets.contract";
import { MichelsonV1Expression } from '@taquito/rpc';
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
    nbSpaces: number,
    playerPositions: MichelsonMap<string, BigNumber>;
    quarantineSpaceId: number;
    lapIncome: number;
    nbLaps: number;
    quarantinePlayers: MichelsonMap<string, number>;
    token: string;
    assets: string;
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
    public static payloadFormat: MichelsonV1Expression = {
      "prim": "pair",
      "args": [{
              "prim": "pair",
              "args": [{
                      "prim": "pair",
                      "args": [
                          { "prim": "pair", "args": [{ "prim": "nat", "annots": ["%assetId"] }, { "prim": "string", "annots": ["%assetType"] }] },
                          {
                              "prim": "pair",
                              "args": [
                                  { "prim": "nat", "annots": ["%featureCost"] },
                                  {
                                      "prim": "pair",
                                      "args": [{ "prim": "nat", "annots": ["%price"] }, { "prim": "set", "args": [{ "prim": "nat" }], "annots": ["%rentRates"] }]
                                  }
                              ]
                          }
                      ],
                      "annots": ["%asset"]
                  },
                  {
                      "prim": "pair",
                      "args": [{
                              "prim": "pair",
                              "args": [
                                  { "prim": "nat", "annots": ["%id"] },
                                  { "prim": "pair", "args": [{ "prim": "int", "annots": ["%param"] }, { "prim": "string", "annots": ["%type"] }] }
                              ],
                              "annots": ["%card"]
                          },
                          { "prim": "int", "annots": ["%dice1"] }
                      ]
                  }
              ]
          },
          {
              "prim": "pair",
              "args": [
                  { "prim": "int", "annots": ["%dice2"] },
                  {
                      "prim": "pair",
                      "args": [{ "prim": "int", "annots": ["%newPosition"] }, { "prim": "set", "args": [{ "prim": "string" }], "annots": ["%options"] }]
                  }
              ]
          }
      ]
  };
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
                  { "prim": "Pair", "args": [ { "string": originator.publicKeyHash }, { "string": originator.publicKeyHash } ] },
                  { "prim": "Pair", "args": [ [], { "string": creator } ] }
                ]
              },
              {
                "prim": "Pair",
                "args": [
                  { "prim": "Pair", "args": [ [], { "int": "200" } ] },
                  { "prim": "Pair", "args": [ { "int": "0" }, { "prim": "Pair", "args": [ { "int": "24" }, { "string": originator.publicKeyHash } ] } ] }
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
                  { "prim": "Pair", "args": [ { "int": "-1" }, { "string": originator.publicKey } ] },
                  { "prim": "Pair", "args": [ [], [] ] }
                ]
              },
              {
                "prim": "Pair",
                "args": [
                  { "prim": "Pair", "args": [ [], [] ] },
                  { "prim": "Pair", "args": [ { "int": "11" }, { "prim": "Pair", "args": [ { "string": "created" }, { "string": originator.publicKeyHash } ] } ] }
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


    async start(keyStore: KeyStore, tokenAddress: string, assetsAddress: string, initialBalance: number): Promise<{txHash: string, onConfirmed: Promise<number>}> {
        const operationName = 'start';
        Tezos.setProvider({ signer: new InMemorySigner(keyStore.privateKey) });
        return new Promise((resolve, reject) => {
            Tezos.contract.at(this._address).then((ci) => {
                try {
                    ci.methods.start(assetsAddress, initialBalance, tokenAddress).send({ fee: 400000, gasLimit: 1000000, storageLimit: 50000 }).then((txOperation: TransactionOperation) => {
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

    async reset(keyStore: KeyStore): Promise<{txHash: string, onConfirmed: Promise<number>}> {
      return new Promise<{txHash: string, onConfirmed: Promise<number>}>((resolve, reject) => {
        const operationName = 'reset_start';
        const operation:(ci: ContractAbstraction<ContractProvider>) => ((...args: any[]) => ContractMethod<ContractProvider>)
         = (ci: any) => ci.methods.reset_start;
         this.callMethodTaquito(keyStore, operationName, { fee: 400000, gasLimit: 900000, storageLimit: 20000 }, operation)
         .then(operationResult => {
           operationResult.onConfirmed.then(() => {
             AssetsContract.retrieve(this._storage?.assets as string).then((assetsContract) => {
               assetsContract.reset(keyStore).then((resetResult) => {
                resetResult.onConfirmed.then(() => {
                  const operationName2 = 'reset_complete';
                  const operation2:(ci: ContractAbstraction<ContractProvider>) => ((...args: any[]) => ContractMethod<ContractProvider>)
                   = (ci: any) => ci.methods.reset_complete;
                   resolve(this.callMethodTaquito(keyStore, operationName2, { fee: 400000, gasLimit: 900000, storageLimit: 20000 }, operation2));
                }).catch(err => reject(err));
              }).catch(err => reject(err));
            }).catch(err => reject(err));
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

    async force_next_player(keyStore: KeyStore, player: string, newPosition: number): Promise<{txHash: string, onConfirmed: Promise<number>}> {
      const operationName = 'force_next_player';
      const operation:(ci: ContractAbstraction<ContractProvider>) => ((...args: any[]) => ContractMethod<ContractProvider>)
       = (ci: any) => ci.methods.force_next_player;
      const callParams = { fee: 400000, gasLimit: 1000000, storageLimit: 20000 };
      return this.callMethodTaquito(keyStore, operationName, callParams, operation, newPosition, player);
  }

    async play2(keyStore: KeyStore, option: string, payload: any, signature: string): Promise<void> {
      let allOptions = '{';
      for (const an_option of payload.options) {
        allOptions += `"${an_option}"`;
      }
      allOptions += '}';
        return tezosService.invokeContract(
          keyStore,
          this._address,
          'play',
          [
            `"${option}"`,
            payload.asset.assetId,
            payload.asset.assetType,
            payload.asset.featurePrice,
            payload.asset.price,
            payload.asset.rentRates,
            payload.cardId,
            payload.dice1,
            payload.dice2,
            payload.newPosition,
            allOptions,
            `"${signature}"`
          ]
          );
    }
    async play(keyStore: KeyStore, option: string, payload: any, signature: string): Promise<{txHash: string, onConfirmed: Promise<number>}> {
        if (["STARTUP_FOUND", "BUY_PRODUCT"].includes(option)) {
          // Call the assets contract instead of the Game one
          console.log(`PLAY OPTION '${option}' -> Call the assets contract instead of the Game one`);
          const assetsContract = await AssetsContract.retrieve((this.storage as any).assets);
          return assetsContract.play(keyStore, option, payload, signature);
        }
        const operationName = 'play';
        const operation:(ci: ContractAbstraction<ContractProvider>) => ((...args: any[]) => ContractMethod<ContractProvider>)
         = (ci: any) => ci.methods.play;
        return this.callMethodTaquito(
          keyStore,
          operationName,
          { fee: 800000, gasLimit: 1000000, storageLimit: 50000 },
          operation,
          option,
          payload.asset.assetId,
          payload.asset.assetType,
          payload.asset.featurePrice,
          payload.asset.price,
          payload.asset.rentRates,
          payload.card.id,
          payload.card.param,
          payload.card.type,
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
