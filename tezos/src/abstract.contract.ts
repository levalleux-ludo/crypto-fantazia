import { tezosService } from "./tezos.service";
import { Tezos } from "@taquito/taquito";

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
}