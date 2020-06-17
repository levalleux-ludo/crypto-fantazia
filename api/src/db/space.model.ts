import mongoose, { Schema, Document } from 'mongoose';
import { dropCollectionIfExist } from './db';

export enum eSpaceType {
    GENESIS = 'GENESIS',
    COVID = 'COVID',
    QUARANTINE = 'QUARANTINE',
    CHANCE = 'CHANCE',
    COMMUNITY = 'COMMUNITY',
    MINING_FARM = 'MINING_FARM',
    BAKERY = 'BAKERY',
    MARKETPLACE = 'MARKETPLACE',
    EXCHANGE = 'EXCHANGE',
    STARTUP = 'STARTUP'
}

export enum eStartupType {
    MINING_FARM = 'MINING_FARM',
    BAKERY = 'BAKERY',
    MARKETPLACE = 'MARKETPLACE',
    EXCHANGE = 'EXCHANGE',
    FIN_TECH = 'FIN_TECH',
    LAW_TECH = 'LAW_TECH',
    BIO_TECH = 'BIO_TECH',
    EDUCATION = 'EDUCATION',
    HW_WALLET = 'HW_WALLET',
    GAME = 'GAME',
    SOCIAL = 'SOCIAL'
}

export interface ISpace extends Document {
    spaceId: number;
    title: string;
    type: eSpaceType;
    family: number;
    subtype: eStartupType;
    detail: string;
    price: number;
    image: string;
    featureCost: number;
    rentRates: number[];
}

const SpaceSchema: Schema = new Schema({
    spaceId: { type: Number, required: true, unique: true },
    title: { type: String, required : true },
    type: { type: String, required : true },
    family: { type: Number, required : false, default: 0 },
    subtype: { type: String, required: false, default: '' },
    detail: { type: String, required : false, default: '' },
    price: { type: Number, required : false, default: 0 },
    image: { type: String, required : true },
    featureCost: { type: Number, required : false, default: 0 },
    rentRates: { type: [Number], required : false, default: [] }
});

export const Space = mongoose.model<ISpace>('Space', SpaceSchema);

export async function dropSpaces(): Promise<void> {
    return dropCollectionIfExist('spaces');
}
