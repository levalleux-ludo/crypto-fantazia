import { tezosService } from "./tezos.service";
import { KeyStore } from "conseiljs";

export const originator = 'tz1bwKJe27WPPXwkbNbTfC4d2rkV7eCb5v44';
export const issuer = 'tz1fV4G1dwVXwXfrrBKvpWUg5B1HNUKYhcki';

class TokenService {
    contractAddress: string = '';
    groupId: string = '';

    constructor() {}

    async createContract(keyStore: KeyStore): Promise<string> {
        return new Promise((resolve, reject) => {
            tezosService.deployContract(
                keyStore,
                100_000,
                true,
                0
            ).then((groupId) => {
                this.groupId = groupId;
                tezosService.awaitOperationConfirmation(groupId, 5).then((conseilResult) => {
                    this.contractAddress = conseilResult['originated_contracts'];
                    resolve(this.contractAddress);
                }).catch(err => {
                    reject(new Error(`awaitOperationConfirmation groupId=${this.groupId} failed with error:${err}`));
                })
            }).catch(err => {
                reject(new Error('Deploy contract failed with error: ' + err));
            });
        });
    }

}

export const tokenService = new TokenService();