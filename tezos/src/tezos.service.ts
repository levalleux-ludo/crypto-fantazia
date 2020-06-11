import * as fs from 'fs';
import * as util from 'util';
import { TezosWalletUtil, KeyStore, ConseilOperator, TezosConseilClient, Tzip7ReferenceTokenHelper, TezosNodeWriter, OperationResult, ConseilQueryBuilder, ConseilDataClient, ConseilMetadataClient, TezosNodeReader, TezosParameterFormat, OperationKindType, TezosContractIntrospector, EntryPoint, CryptoUtils, TezosMessageUtils } from 'conseiljs';
import * as path from 'path';
import BigNumber from 'bignumber.js'

import { networkInterfaces } from 'os';
import { Tezos } from '@taquito/taquito';
import {InMemorySigner} from '@taquito/signer';

const platform = 'tezos';
const tezosNode = 'https://tezos-dev.cryptonomic-infra.tech:443';
const conseilServer = {
    url: 'https://conseil-dev.cryptonomic-infra.tech:443', // !!!! IMPORTANT : do NOT add an ending '/' to this URL
    apiKey: '79e54a13-0b95-4e4d-a509-c38cb0158361',
    network: 'carthagenet'
};
const networkBlockTime = 30 + 1; // since testnet's block time is 30 seconds, we wait 31 seconds before checking for a block update
const accountsWalletFolder = process.env.TEZOS_ACCOUNTS_DIR || path.join(__dirname, "../accounts");

export interface IdentityData {
    mnemonic: string[];
    email: string;
    password: string;
    pkh: string;
    secret: string;
}

Tezos.setProvider({
    rpc: tezosNode,
    signer: new InMemorySigner('edskRu8Tv5h8MPcHMdsF7JugmHhNCqhyb891LHdBggc3zYAkvs3aTYe8eHNZCEngGrf4bY4s6eGjR5Y9X6dVCEAdnewei1XaST')
});


class TezosService {

    public static clearRPCOperationGroupHash(hash: string) {
        return hash.replace(/\"/g, '').replace(/\n/, '');
    }
    
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

    async activateAccount(keyStore: KeyStore, secret: string): Promise<string> {
        console.log(`activateAccount ${keyStore.publicKeyHash}`);
        const accountRecord = await TezosConseilClient.getAccount(conseilServer, conseilServer.network, keyStore.publicKeyHash);
        if (accountRecord !== undefined) { return accountRecord['account_id']; }
    
        const result = await TezosNodeWriter.sendIdentityActivationOperation(tezosNode, keyStore, secret);
        const groupId = TezosService.clearRPCOperationGroupHash(result.operationGroupID);
        console.log(`Injected operation group id ${groupId}`);
        const conseilResult = await TezosConseilClient.awaitOperationConfirmation(conseilServer, conseilServer.network, groupId, 5, networkBlockTime);
        console.log(`Activated account at ${conseilResult.pkh}`);
        return conseilResult.pkh;
    }

    async checkAccount(accountId: string): Promise<any> {
        return TezosConseilClient.getAccount(conseilServer, conseilServer.network, accountId);
    }

    async getNetworks(): Promise<any[]> {
        try {
            const networks = await ConseilMetadataClient.getNetworks(conseilServer, platform);
            console.log('Networks: ', networks.length);
            for (const net of networks) {
                console.log(net);
            }
            return networks
        } catch(err) {console.error(err)};
        return [];
    }

    getNode(): string {
        return tezosNode;
    }

    async revealAccount(keyStore: KeyStore): Promise<string> {
        console.log(`revealAccount`);
        if (await TezosNodeReader.isManagerKeyRevealedForAccount(tezosNode, keyStore.publicKeyHash)) {
            return keyStore.publicKeyHash;
        }

        const result = await TezosNodeWriter.sendKeyRevealOperation(tezosNode, keyStore);
        const groupId = TezosService.clearRPCOperationGroupHash(result.operationGroupID);
        console.log(`Injected operation group id ${groupId}`);
        const conseilResult = await TezosConseilClient.awaitOperationConfirmation(conseilServer, conseilServer.network, groupId, 5, networkBlockTime);
        console.log(`Revealed account at ${conseilResult.source}`);
        return conseilResult.source;
    }

    async accountInfo(address: string): Promise<any[]> {
        let accountQuery = ConseilQueryBuilder.blankQuery();
        accountQuery = ConseilQueryBuilder.addFields(accountQuery, 'account_id', 'delegate_value', 'balance', 'block_level');
        accountQuery = ConseilQueryBuilder.addPredicate(accountQuery, 'account_id', ConseilOperator.EQ, [address], false);
        accountQuery = ConseilQueryBuilder.setLimit(accountQuery, 1);
    
        const result = await ConseilDataClient.executeEntityQuery(conseilServer, platform, conseilServer.network, 'accounts', accountQuery);
    
        console.log(`${util.inspect(result, false, 2, false)}`);

        return result;
    }

    async verifyDestination(address: string): Promise<boolean> {
        return Tzip7ReferenceTokenHelper.verifyDestination(tezosNode, address);
    }

    async deployContract(
        contract: any,
        storage: any,
        keystore: KeyStore): Promise<string> {
        const result = await TezosNodeWriter.sendContractOriginationOperation(
            tezosNode,
            keystore,
            0, // amount
            undefined, // delegate
            100000, // fee,
            '', // derivationPath
            5000, // storage_limit
            100000, // gas_limit
            contract,
            storage,
            TezosParameterFormat.Micheline
        );
        const groupId = TezosService.clearRPCOperationGroupHash(result.operationGroupID);
        console.log(`Injected operation group id ${groupId}`);
        const conseilResult = await TezosConseilClient.awaitOperationConfirmation(conseilServer, conseilServer.network, groupId, 5, networkBlockTime);
        console.log(`Originated contract at ${conseilResult.originated_contracts}`);
        return conseilResult.originated_contracts;
    }

    async invokeContract(keystore: KeyStore, address: string, entryPoint: string, parameters: any[], onTxCreated?: (or: OperationResult) => void) {

        console.log(`invokeContract`);
        // parameters.forEach((param, index, array) => {
        //     if ( util.isString(param) && param.charAt(0) !== '"') {
        //         console.log("transform param", param);
        //         param = '"' + param + '"';
        //         console.log('after:', param)
        //         array[index] = param;
        //     }
        // })
        const entryPointsMap = await this.parseContract(address);
        const ep = entryPointsMap.get(entryPoint);
        const params = ep?.generateInvocationPair(...parameters);
        // const params = parameters.length > 0 ? ep?.generateInvocationPair(...parameters) : undefined;
        console.log('params', params?.parameters);

        const fee = Number((await TezosConseilClient.getFeeStatistics(conseilServer, conseilServer.network, OperationKindType.Transaction))[0]['high']);
   
        console.log('fee', fee);
        let storageResult = await TezosNodeReader.getContractStorage(tezosNode, address);
        console.log(`initial storage: ${JSON.stringify(storageResult)}`);
        const parameterFormat = TezosParameterFormat.Michelson;

        await TezosNodeWriter.testContractInvocationOperation(
            tezosNode,
            'main',
            keystore,
            address,
            0, // amount
            fee, // fee
            5000, // storage_limit
            100000, // gas_limit
            entryPoint,
            params?.parameters,
            parameterFormat
        ).then(async ({ gas, storageCost }) => {
            console.log(`gas: ${gas}, storageCost:${storageCost}`);
        // const gas = 100000;
            const factor = 2; // is avoiding Tx failed with gas_exhausted.operation ??
        // const storageCost = 5000;
            const nodeResult = await TezosNodeWriter.sendContractInvocationOperation(
                tezosNode,
                keystore,
                address,
                0, // amount
                factor*fee, // fee
                '', // derivationPath
                factor*storageCost, //storage_limit
                factor*gas, // gas_limit
                entryPoint,
                parameters.length > 0 ? params?.parameters : undefined,
                parameters.length > 0 ? parameterFormat : undefined
            );
        
            const groupId = TezosService.clearRPCOperationGroupHash(nodeResult.operationGroupID);
            console.log(`Injected transaction(invocation) operation with ${groupId}`);
        
            const conseilResult = await TezosConseilClient.awaitOperationConfirmation(conseilServer, conseilServer.network, groupId, 5, networkBlockTime);
            console.log(`Completed invocation of ${conseilResult.destination}`);
            storageResult = await TezosNodeReader.getContractStorage(tezosNode, address);
            console.log(`modified storage: ${JSON.stringify(storageResult)}`);
        }).catch(err => {
            console.error(err);
            throw new Error(err);
        });
    
    }

    async readContract(address: string): Promise<any> {
        console.log('readContract');
        return await TezosNodeReader.getContractStorage(tezosNode, address);
    }

    async parseContract(address: string): Promise<Map<string, EntryPoint>> {
        const map = new Map();
        const entryPoints = await TezosContractIntrospector.generateEntryPointsFromAddress(conseilServer, conseilServer.network, address);
        for (const entryPoint of entryPoints) {
            map.set(entryPoint.name, entryPoint);
            console.log(`entryPoint:${entryPoint.name}(${entryPoint.parameters.map(p => (p.name ? p.name + ': ' : '') + 'type:' + p.type + (p.optional ? '?' : '')).join(', ')})`)
            console.log(`structure:${entryPoint.structure}`)
        }
        return map;
    }

    async dumpMempool(account: string) {
        const rr = await TezosNodeReader.getMempoolOperationsForAccount(tezosNode, account);
    
        await Promise.all(
            rr.map(async (r: any) => {
                const ttl = '?'; // await TezosNodeReader.estimateBranchTimeout(tezosNode, r['branch']); <-- method not available yet in conseilJS current version
                const t = r['contents'][0];
                console.log(`operation ${r['hash']} for ${new BigNumber(t.amount || 0).toNumber()}xtz expires in ${ttl} blocks`)
            })
        );
    }

    async awaitOperationConfirmation(hash: string, duration: number): Promise<any> {
        return TezosConseilClient.awaitOperationConfirmation(conseilServer, conseilServer.network, hash, duration, networkBlockTime);
    }
    async getAccountFromFile(accountFile: string): Promise<KeyStore> {

        if (!fs.existsSync(accountFile)) {
            throw new Error(`File ${accountFile} does not exist`);
        }
        const faucetAccount = JSON.parse(fs.readFileSync(accountFile, 'utf8'));

        return this.getAccountFromIdentity(faucetAccount);
    }

    async getAccountFromIdentity(identityData: IdentityData): Promise<KeyStore> {

        const keyStore = await TezosWalletUtil.unlockFundraiserIdentity(identityData['mnemonic'].join(' '), identityData['email'], identityData['password'], identityData['pkh']);

        await this.activateAccount(keyStore, identityData['secret']);

        await this.revealAccount(keyStore);

        return keyStore;
    }
    async getAccount(account: string): Promise<KeyStore> {

        const accountFile = path.join(accountsWalletFolder, `${account}.json`);

        return this.getAccountFromFile(accountFile);
    }

    async make_signature(payload: Buffer, privateKey: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const key = TezosMessageUtils.writeKeyWithHint(privateKey, 'edpk');
            const hash = CryptoUtils.simpleHash(payload, 32);
            CryptoUtils.signDetached(hash, key).then((signedBuffer) => {
                const signature = TezosMessageUtils.readSignatureWithHint(signedBuffer, 'edsig');
                resolve(signature);
            }).catch(err => reject(err));
        })
    }

}

export const tezosService = new TezosService();