import { MichelsonMap, ContractAbstraction, ContractProvider, ContractMethod } from "@taquito/taquito";
import { AbstractContract } from "./abstract.contract";

import chanceContract from './chance.contract.json';
import { KeyStore } from "conseiljs";
import { tezosService } from "./tezos.service";
import BigNumber from "bignumber.js";

export interface ChanceContractStorage {
    admin: string;
    chances: MichelsonMap<number, any>;
    gameContract: string;
}

export interface IChanceParams {id: number, type: string, param: number}

export class ChanceContract extends AbstractContract<ChanceContractStorage> {
    public static async deploy(keyStore: KeyStore, admin: string, gameContract: string, chances: IChanceParams[]): Promise<ChanceContract> {
        const address = await tezosService.deployContract(
            JSON.stringify(chanceContract),
            JSON.stringify(this.getInitialStorage(admin, gameContract, chances)),
            keyStore
        ).catch(err => {
            console.error('Error during Chance contract deployment:' + err);
            throw(new Error('Error during Chance contract deployment:' + err));
        });
        return new ChanceContract(address);
    }
    public static async retrieve(address: string): Promise<ChanceContract> {
        // TODO: check if contract is correctly deployed at specified address
        const contract = new ChanceContract(address);
        await contract.update();
        return contract;
    }
    protected constructor(address: string) {
        super(address);
    }
    protected static getInitialStorage(admin: string, gameContract: string, chances: IChanceParams[]) {
        const chanceDescription = (chance: IChanceParams) => {
            return { "prim": "Elt", "args": [ { "int": chance.id.toFixed(0) }, { "prim": "Pair", "args": [ { "int": chance.param.toString() }, { "string": chance.type } ] } ] };
        }
        const allChances = [];
        for (const chance of chances) {
          allChances.push(chanceDescription(chance));
        }
        return {
          "prim": "Pair",
          "args": [
            { "string": admin },
            {
              "prim": "Pair",
              "args": [
                allChances,
                { "string": gameContract }
              ]
            }
          ]
        };
    }
}
