import { KeyStore } from 'conseiljs';
import { tokenService } from '../../../../tezos/src/token.service';
import { AbstractContract } from '../../../../tezos/src/abstract.contract';

const initialStorage = {}

export class TokenContract extends AbstractContract {
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