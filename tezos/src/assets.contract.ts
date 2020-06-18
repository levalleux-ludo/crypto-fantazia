import { MichelsonMap, ContractAbstraction, ContractProvider, ContractMethod } from "@taquito/taquito";
import { AbstractContract } from "./abstract.contract";

import assetsContract from './assets.contract.json';
import { KeyStore } from "conseiljs";
import { tezosService } from "./tezos.service";
import BigNumber from "bignumber.js";

export interface AssetsContractStorage {
    admin: string;
    gameContract: string;
    assets: MichelsonMap<number, any>;
    ownership: MichelsonMap<number, string>;
    portfolio: MichelsonMap<string, BigNumber[]>;
}

export interface IAssetParams {assetId: number, type: string, price: number, featurePrice: number, rentRates: number[]}

export class AssetsContract extends AbstractContract<AssetsContractStorage> {
    public static async deploy(keyStore: KeyStore, admin: string, gameContract: string, assets: any[]): Promise<AssetsContract> {
        const address = await tezosService.deployContract(
            JSON.stringify(assetsContract),
            JSON.stringify(this.getInitialStorage(admin, gameContract, assets)),
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
    protected static getInitialStorage(admin: string, gameContract: string, assets: IAssetParams[]) {
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
        const allAssets = [];
        for (const asset of assets) {
            if (asset.rentRates.length != 5) throw new Error('Was expecting 5 elements in rentRates set for asset with id ' + asset.assetId);
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
                  { "string": admin },
                  {
                    "prim": "Pair",
                    "args": [
                      allAssets,
                      { "int": "0" }
                    ]
                  }
                ]
              },
              { "prim": "Pair", "args": [ { "prim": "Pair", "args": [ [], { "string": gameContract } ] }, { "prim": "Pair", "args": [ [], [] ] } ] }
            ]
          };
    }

    async buy(keyStore: KeyStore, assetId: number, buyer: string): Promise<{txHash: string, onConfirmed: Promise<number>}> {
        const operationName = 'buy';
        const operation:(ci: ContractAbstraction<ContractProvider>) => ((...args: any[]) => ContractMethod<ContractProvider>)
         = (ci: any) => ci.methods.buy;
        const callParams = { fee: 800000, gasLimit: 1000000, storageLimit: 50000 };
        return this.callMethodTaquito(keyStore, operationName, callParams, operation, assetId, buyer);
    }


}