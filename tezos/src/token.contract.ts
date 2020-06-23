import { KeyStore } from 'conseiljs';
import { MichelsonMap, BigMapAbstraction } from '@taquito/taquito';
import { AbstractContract } from './abstract.contract';
import { tokenService } from './token.service';
import { tezosService } from './tezos.service';
import tokenContract from './token.contract.json';
import BigNumber from 'bignumber.js';
import { resolve } from 'dns';

const initialStorage = {}

export interface TokenContractStorage {
    admin: string;
    balances: MichelsonMap<string, {approvals: any, balance: number}>;
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
        ).catch(err => {
            console.error('Error during token contract deployment:' + err);
            throw(new Error('Error during token contract deployment:' + err));
        });
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

    public async getBalances(players: Array<string>): Promise<Map<string, number>> {
        return new Promise((resolve, reject) => {
            const balances = new Map<string, number>();
            const promises = [];
            for (let address of players) {
                promises.push(new Promise((resolve2, reject2) => {
                    const account = this._storage?.balances.get(address);
                    if (account) {
                        const value = ((account as any).balance as BigNumber).toNumber();
                        balances.set(address, value);
                    }
                    resolve2();
                }));
            }
            Promise.all(promises).then(() => {
                resolve(balances);
            }).catch(() => {
                resolve(new Map<string, number>()); // never fail
            })
        });
    }

}