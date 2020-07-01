import { tezosService } from "./tezos.service";
import { KeyStore, Tzip7ReferenceTokenHelper } from "conseiljs";

export const originator = 'tz1fV4G1dwVXwXfrrBKvpWUg5B1HNUKYhcki';
export const issuer = 'tz1fV4G1dwVXwXfrrBKvpWUg5B1HNUKYhcki';

class TokenService {
    contractAddress: string = '';
    groupId: string = '';

    constructor() {}

    async createContract(keyStore: KeyStore, administrator?: string): Promise<string> {
        return new Promise((resolve, reject) => {
            Tzip7ReferenceTokenHelper.deployContract(
                tezosService.getNode(),
                keyStore,
                100_000,
                administrator ? administrator : keyStore.publicKeyHash,
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