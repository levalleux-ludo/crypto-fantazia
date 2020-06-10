import {Tezos, MichelsonMap} from '@taquito/taquito';
import { AbstractContract } from './abstract.contract';
import BigNumber from 'bignumber.js';

export interface SampleContractStorage {
    owner: string;
     nameToEvent: MichelsonMap<string, {date: string, numGuests: BigNumber}>;
}

export class SampleContract extends AbstractContract<SampleContractStorage> {
}