import mongoose, { Schema, Document } from 'mongoose';

export interface IGame extends Document {
    sessionId: string;
    status: string;
    creator: string;
    creationDate: Date;
    contractAddresses: {
        game: string;
        token: string;
        chance: string;
        community: string;
        assets: string;
    },
    players: string[];
    turns: string[];
    positions: Map<string, number>;
}

const GameSchema: Schema = new Schema({
    sessionId: { type: String, required: true, unique: true },
    status: { type: String, required: true },
    creator: { type: String, required: true },
    creationDate: { type: Date, required: false, default: Date.now },
    contractAddresses: {
        game: { type: String, required: false },
        token: { type: String, required: false },
        chance: { type: String, required: false },
        community: { type: String, required: false },
        assets: { type: String, required: false }
    },
    players: {type: [String], required: false, default: [] },
    turns: { type: [Schema.Types.ObjectId], required: false, default: [] },
    positions: { type: Map, of: Number , required: false, default: {} },
});

export default mongoose.model<IGame>('Game', GameSchema);
