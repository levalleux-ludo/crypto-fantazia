import mongoose, { Schema, Document } from 'mongoose';
import { dropCollectionIfExist } from './db';

export interface ICardDetails extends Document {
    cardId: number;
    cardText: string;
    impl: string;
    properties: Map<string, string>;
}

const CardSchema: Schema = new Schema({
    cardId: { type: Number, required: true },
    cardText: { type: String, required: true },
    impl: { type: String, required: true },
    properties: { type: Map, of: String, required: false }
});

export const Chance = mongoose.model<ICardDetails>('Chance', CardSchema);
export const CommunityChest = mongoose.model<ICardDetails>('CommunityChest', CardSchema);

export async function dropChances(): Promise<void> {
    return dropCollectionIfExist('chances');
}

export async function dropCCs(): Promise<void> {
    return dropCollectionIfExist('communitychests');
}
