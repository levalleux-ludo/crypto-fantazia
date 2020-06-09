import { tezosService } from '../../../../tezos/src/tezos.service';
import { AbstractContract } from '../../../../tezos/src/abstract.contract';
import { KeyStore } from 'conseiljs';

import gameContract from './game.contract.json';

export class GameContract extends AbstractContract {
    public static async deploy(keyStore: KeyStore): Promise<GameContract> {
        const address = await tezosService.deployContract(
            JSON.stringify(gameContract),
            JSON.stringify(this.getInitialStorage(keyStore)),
            keyStore
        );
        return new GameContract(address);
    }
    public static async retrieve(address: string): Promise<GameContract> {
        // TODO: check if contract is correctly deployed at specified address
        return new GameContract(address);
    }
    protected constructor(address: string) {
        super(address);
    }
    protected static getInitialStorage(originator: KeyStore) {
        return {
            "prim": "Pair",
            "args": [
            {
                "prim": "Pair",
                "args": [
                { "prim": "Pair", "args": [ { "prim": "False" }, { "int": "0" } ] },
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
        };
    };
    
    

}