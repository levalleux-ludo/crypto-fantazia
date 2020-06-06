import * as fs from 'fs';
import * as util from 'util';
import { TezosWalletUtil, KeyStore, ConseilOperator, TezosConseilClient, Tzip7ReferenceTokenHelper, TezosNodeWriter, OperationResult, ConseilQueryBuilder, ConseilDataClient, ConseilMetadataClient } from 'conseiljs';
import path from 'path';
import { networkInterfaces } from 'os';

const platform = 'tezos';
const tezosNode = 'https://tezos-dev.cryptonomic-infra.tech:443';
const conseilServer = {
    url: 'https://conseil-dev.cryptonomic-infra.tech:443', // !!!! IMPORTANT : do NOT add an ending '/' to this URL
    apiKey: '79e54a13-0b95-4e4d-a509-c38cb0158361',
    network: 'carthagenet'
};
const networkBlockTime = 30 + 1; // since testnet's block time is 30 seconds, we wait 31 seconds before checking for a block update
const accountsWalletFolder = process.env.TEZOS_ACCOUNTS_DIR || path.join(__dirname, "../accounts");

class TezosService {
    
    public async initAccount(account: string): Promise<{keyStore: KeyStore, secret: string}> {
        console.log(" ~~ initAccount");
        console.log(`loading ${account} faucet file`);
        const accountFile = path.join(accountsWalletFolder, `${account}.json`);

        if (!fs.existsSync(accountFile)) {
            throw new Error(`File ${accountFile} does not exist (__dirname=${__dirname})`);
        }

        const faucetAccount = JSON.parse(fs.readFileSync(accountFile, 'utf8'));

        const keystore = await TezosWalletUtil.unlockFundraiserIdentity(faucetAccount['mnemonic'].join(' '), faucetAccount['email'], faucetAccount['password'], faucetAccount['pkh']);
        console.log(`public key: ${keystore.publicKey}`);
        console.log(`secret key: ${keystore.privateKey}`);
        console.log(`account hash: ${keystore.publicKeyHash}`);

        return {keyStore: keystore, secret: faucetAccount['secret']};
    }

    async activateAccount(keyStore: KeyStore, secret: string): Promise<void> {
        const result = await TezosNodeWriter.sendIdentityActivationOperation(tezosNode, keyStore, secret);
        console.log(`Injected operation group id ${result.operationGroupID}`);
        return;
    }

    async checkAccount(accountId: string): Promise<any> {
        return TezosConseilClient.getAccount(conseilServer, conseilServer.network, accountId);
    }

    async getNetworks() {
        ConseilMetadataClient.getNetworks(conseilServer, platform).then((networks) => {
            console.log('Networks: ', networks.length);
            for (const net of networks) {
                console.log(net);
            }
        }).catch(err => console.error(err));
    }

    async revealAccount(keyStore: KeyStore): Promise<OperationResult> {
        return TezosNodeWriter.sendKeyRevealOperation(tezosNode, keyStore);
    }

    async accountInfo(address: string) {
        let accountQuery = ConseilQueryBuilder.blankQuery();
        accountQuery = ConseilQueryBuilder.addFields(accountQuery, 'account_id', 'delegate_value', 'balance', 'block_level');
        accountQuery = ConseilQueryBuilder.addPredicate(accountQuery, 'account_id', ConseilOperator.EQ, [address], false);
        accountQuery = ConseilQueryBuilder.setLimit(accountQuery, 1);
    
        const result = await ConseilDataClient.executeEntityQuery(conseilServer, platform, conseilServer.network, 'accounts', accountQuery);
    
        console.log(`${util.inspect(result, false, 2, false)}`);
    }

    async verifyDestination(address: string): Promise<boolean> {
        return Tzip7ReferenceTokenHelper.verifyDestination(tezosNode, address);
    }

    async deployContract(keystore: KeyStore, fee: number, pause?: boolean, supply?: number, gas?: number, freight?: number): Promise<string> {
        return Tzip7ReferenceTokenHelper.deployContract(
            tezosNode,
            keystore,
            fee,
            keystore.publicKeyHash,
            pause,
            supply,
            gas,
            freight
        );
    }

    async awaitOperationConfirmation(hash: string, duration: number): Promise<any> {
        return TezosConseilClient.awaitOperationConfirmation(conseilServer, conseilServer.network, hash, duration, networkBlockTime);
    }

}

export const tezosService = new TezosService();