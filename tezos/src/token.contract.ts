import { KeyStore } from 'conseiljs';
import { MichelsonMap } from '@taquito/taquito';
import { AbstractContract } from './abstract.contract';
import { tokenService } from './token.service';

const initialStorage = {}

export interface TokenContractStorage {
    admin: string;
    ledger: MichelsonMap<any, any>;
    paused: boolean,
    totalSupply: number
}

export class TokenContract extends AbstractContract<TokenContractStorage> {
    public static async deploy(keyStore: KeyStore): Promise<TokenContract> {
        const address = await tokenService.createContract(
            keyStore
        );
        return new TokenContract(address);
    }
    public static async retrieve(address: string): Promise<TokenContract> {
        // TODO: check if contract is correctly deployed at specified address
        return new TokenContract(address);
    }

    protected constructor(address: string) {
        super(address);
    }

}