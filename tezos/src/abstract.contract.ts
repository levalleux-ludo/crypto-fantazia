import { tezosService } from "./tezos.service";
import { Tezos, ContractAbstraction, ContractProvider, ContractMethod } from "@taquito/taquito";
import { KeyStore } from "conseiljs";
import {InMemorySigner} from '@taquito/signer';
import { TransactionOperation } from "@taquito/taquito/dist/types/operations/transaction-operation";

export abstract class AbstractContract<T> {
    _storage: T | undefined;
    oldStorageStr: string | undefined;
    watcher: NodeJS.Timeout | undefined;
    constructor(
        protected _address: string
    ) {}
    public async update(): Promise<T> {
        const ci = await Tezos.contract.at(this.address);
        this._storage = await ci.storage<T>();
        return this._storage;
    }
    public get address() {
        return this._address;
    }
    public get storage(): T | undefined {
        return this._storage;
    }
    public startWatching(period_ms: number, onChange?: (storage: T) => void) {
        if (this.watcher) {
            throw new Error('Unable to start watching because watching already active');
        }
        const callback = () => {
            try {
                // this.update().then((newStorage) => {
                    const newStorage = this._storage as any;
                    const newStorageStr = JSON.stringify(newStorage);
                    if (newStorageStr !== this.oldStorageStr) {
                        console.log('Change detected in contract at ' + this.address);
                        this.oldStorageStr = newStorageStr;
                        if (onChange) {
                            onChange(newStorage);
                        }
                    }
                    setTimeout(callback, period_ms);
                // });
            } catch (err) {
                console.error('Error when updating contract:' + JSON.stringify(err));
                setTimeout(callback, period_ms);
            }
        }
        this.watcher = setTimeout(callback, period_ms);
    }
    public stopWatching() {
        if (!this.watcher) {
            console.error('Unable to stop watching because watching is not currently active');
            return;
        }
        clearInterval(this.watcher);
        this.watcher = undefined;
    }
    public get isWatching(): boolean {
        return this.watcher !== undefined;
    }

    protected async callMethodTaquito(
        keyStore: KeyStore,
        operationName: string,
        callParams: any | undefined,
        operation: (ci: ContractAbstraction<ContractProvider>) => ((...args: any[]) => ContractMethod<ContractProvider>),
        ...args: any[]
    ): Promise<{txHash: string, onConfirmed: Promise<number>}> {
        Tezos.setProvider({ signer: new InMemorySigner(keyStore.privateKey) });
        return new Promise((resolve, reject) => {
            Tezos.contract.at(this._address).then((ci) => {
                try {
                    let method = args.length === 0 ? operation(ci)(null)
                     : args.length === 1 ? operation(ci)(args[0])
                     : args.length === 2 ? operation(ci)(args[0], args[1])
                     : args.length === 3 ? operation(ci)(args[0], args[1], args[2])
                     : undefined;
                     if (!method) {
                         throw new Error('Too many parameters: ' + args);
                     }

                    method.send(callParams).then((txOperation: TransactionOperation) => {
                        console.log(`returns from ${operationName} call: ${txOperation}`);
                        resolve({
                            txHash: txOperation.hash,
                            onConfirmed: txOperation.confirmation(1, 10, 180)
                        });
                    }).catch(err => {
                        console.error(`Error during ${operationName} call: ${err.id}, ${err.message}`);
                        reject(err);
                    });
                } catch (err) {
                    console.error(`Error during ${operationName} call: ${err.id}, ${err.message}`);
                    reject(err);
                }
            });
        });
    }

}