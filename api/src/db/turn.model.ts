import mongoose, { Schema, Document } from 'mongoose';

export enum eDiceType {
    POW = 0,
    POS = 1
}

export interface ITurn extends Document {
    sessionId: string;
    turnId: number;
    player: string;
    oldPosition: number;
    newPosition: number;
    dices: number[];
    cardId: number;
    signature: string;
    completed: boolean;
}

const TurnSchema: Schema = new Schema({
    sessionId: { type: String, required: true },
    turnId: { type: Number, required: true },
    player: { type: String, required: true },
    oldPosition: { type: Number, required: true },
    newPosition: { type: Number, required: true },
    dices: { type: [Number], required: true },
    cardId: { type: Number, required: true },
    signature : { type: String, required: true },
    completed: { type: Boolean, required: false, default: false }

});

export default mongoose.model<ITurn>('Turn', TurnSchema);
