import { MichelsonMap, ContractAbstraction, ContractProvider, ContractMethod } from "@taquito/taquito";
import { AbstractContract } from "./abstract.contract";

import assetsContract from './assets.contract.json';
import { KeyStore } from "conseiljs";
import { tezosService } from "./tezos.service";
import BigNumber from "bignumber.js";
import { assert } from "console";

export interface AssetsContractStorage {
    admin: string;
    gameContract: string;
    tokenContract: string;
    assets: MichelsonMap<number, any>;
    ownership: MichelsonMap<string, string>; // should be <number, string>, but strangely keys are string (?)
    portfolio: MichelsonMap<string, BigNumber[]>;
    features: MichelsonMap<number, string>;
    debug: number;
}

export interface IAssetParams {assetId: number, type: string, price: number, featurePrice: number, rentRates: number[]}

export class AssetsContract extends AbstractContract<AssetsContractStorage> {
    public static async deploy(keyStore: KeyStore, adminKeyStore: KeyStore, gameContract: string, tokenContract: string): Promise<AssetsContract> {
        const address = await tezosService.deployContract(
            JSON.stringify(assetsContract),
            JSON.stringify(this.getInitialStorage(adminKeyStore, gameContract, tokenContract)),
            keyStore
        ).catch(err => {
            console.error('Error during Assets contract deployment:' + err);
            throw(new Error('Error during Assets contract deployment:' + err));
        });
        return new AssetsContract(address);
    }
    public static async retrieve(address: string): Promise<AssetsContract> {
        // TODO: check if contract is correctly deployed at specified address
        const contract = new AssetsContract(address);
        await contract.update();
        return contract;
    }
    protected constructor(address: string) {
        super(address);
    }
    protected static getInitialStorage(originator: KeyStore, gameContract: string, tokenContract: string) {
        // const assetDescription = (assetId: number, type: string, price: number, featurePrice: number, rentRates: number[]) => {
        //     return {
        //         "prim": "Elt",
        //         "args": [
        //           { "int": assetId.toFixed(0) },
        //           {
        //             "prim": "Pair",
        //             "args": [
        //               { "prim": "Pair", "args": [ { "int": assetId.toFixed(0) }, { "string": type } ] },
        //               {
        //                 "prim": "Pair",
        //                 "args": [
        //                   { "int": featurePrice.toString() },
        //                   { "prim": "Pair", "args": [ { "int": price.toString() }, [ { "int": rentRates[0].toString() }, { "int": rentRates[1].toString() }, { "int": rentRates[2].toString() }, { "int": rentRates[3].toString() }, { "int": rentRates[4].toString() } ] ] }
        //                 ]
        //               }
        //             ]
        //           }
        //         ]
        //       };
        // }
        // const allAssets = [];
        // for (const asset of assets) {
        //     if (asset.rentRates.length === 0) {
        //       if (asset.featurePrice !== 0) {
        //         throw new Error('Was expecting some rentRates set for asset with id ' + asset.assetId);
        //       }
        //       asset.rentRates = [0, 0, 0, 0, 0];
        //     }
        //     if (asset.rentRates.length != 5) {
        //       throw new Error('Was expecting 5 elements in rentRates set for asset with id ' + asset.assetId);
        //     }
        //     allAssets.push(assetDescription(
        //         asset.assetId,
        //         asset.type,
        //         asset.price,
        //         asset.featurePrice,
        //         asset.rentRates
        //     ));
        // }
        return {
            "prim": "Pair",
            "args": [
              {
                "prim": "Pair",
                "args": [
                  { "prim": "Pair", "args": [ { "string": originator.publicKeyHash }, { "int": "0" } ] },
                  { "prim": "Pair", "args": [ [], { "string": gameContract } ] }
                ]
              },
              {
                "prim": "Pair",
                "args": [
                  { "prim": "Pair", "args": [ { "string": originator.publicKey }, [] ] },
                  { "prim": "Pair", "args": [ [], { "string": tokenContract } ] }
                ]
              }
            ]
        };
    }

    async buy(keyStore: KeyStore, asset: IAssetParams, buyer: string): Promise<{txHash: string, onConfirmed: Promise<number>}> {
        const operationName = 'buy';
        const operation:(ci: ContractAbstraction<ContractProvider>) => ((...args: any[]) => ContractMethod<ContractProvider>)
         = (ci: any) => ci.methods.buy;
        const callParams = { fee: 800000, gasLimit: 1000000, storageLimit: 50000 };
        return this.callMethodTaquito(keyStore, operationName, callParams, operation, asset.assetId, asset.type, asset.featurePrice, asset.price, asset.rentRates, buyer);
    }

    async reset(keyStore: KeyStore): Promise<{txHash: string, onConfirmed: Promise<number>}> {
      const operationName = 'reset';
      const operation:(ci: ContractAbstraction<ContractProvider>) => ((...args: any[]) => ContractMethod<ContractProvider>)
       = (ci: any) => ci.methods.reset;
      const callParams = { fee: 800000, gasLimit: 1000000, storageLimit: 50000 };
      return this.callMethodTaquito(keyStore, operationName, callParams, operation);
  }

  async play(keyStore: KeyStore, option: string, payload: any, signature: string): Promise<{txHash: string, onConfirmed: Promise<number>}> {
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

  getPortfolio(player: string): number[] | undefined {
    const portfolio = this.storage?.portfolio.get(player);
    if (!portfolio) {
        return undefined;
    }
    return portfolio.map(bn => bn.toNumber());
  }


}