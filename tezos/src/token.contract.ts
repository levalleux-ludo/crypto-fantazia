import { KeyStore } from 'conseiljs';
import { MichelsonMap } from '@taquito/taquito';
import { AbstractContract } from './abstract.contract';
import { tokenService } from './token.service';
import { tezosService } from './tezos.service';
import tokenContract from './token.contract.json';

const initialStorage = {}

export interface TokenContractStorage {
    admin: string;
    balances: MichelsonMap<any, any>;
    paused: boolean,
    totalSupply: number,
    lastCaller: string
}

export class TokenContract extends AbstractContract<TokenContractStorage> {
    public static async deploy(keyStore: KeyStore, administrator: string): Promise<TokenContract> {
        // const address = await tokenService.createContract(
        //     keyStore,
        //     administrator
        // );
        // return new TokenContract(address);
        const address = await tezosService.deployContract(
            JSON.stringify(tokenContract),
            JSON.stringify(this.getInitialStorage(administrator)),
            keyStore
        );
        return new TokenContract(address);
    }
    public static async retrieve(address: string): Promise<TokenContract> {
        const contract = new TokenContract(address);
        await contract.update();
        return contract;
    }

    protected static getInitialStorage(admin: string) {
        return {
            "prim": "Pair",
            "args": [
              { "prim": "Pair", "args": [ { "string": admin }, [] ] },
              { "prim": "Pair", "args": [ { "string": admin }, { "prim": "Pair", "args": [ { "prim": "False" }, { "int": "0" } ] } ] }
            ]
          }
    };

    protected constructor(address: string) {
        super(address);
    }


}