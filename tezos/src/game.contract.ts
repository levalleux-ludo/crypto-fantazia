import { AbstractContract } from "./abstract.contract";
import { MichelsonMap } from "@taquito/taquito";
import gameContract from './game.contract.json';
import { KeyStore } from "conseiljs";
import { tezosService } from "./tezos.service";
import { sign } from "crypto";

export interface GameContractStorage {
    originator_address: string;
    originator_pubKey: string;
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
        const contract = new GameContract(address);
        return contract;
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
    
    async register(keyStore: KeyStore, random: number, signature: string) {
        return tezosService.invokeContract(keyStore, this._address, 'register', [random, signature]);
    }

}