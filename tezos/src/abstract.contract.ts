import { tezosService } from "./tezos.service";

export abstract class AbstractContract {
    constructor(
        protected _address: string
    ) {}
    public get address() {
        return this._address;
    }
}