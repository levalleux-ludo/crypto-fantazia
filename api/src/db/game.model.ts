import mongoose, { Schema, Document } from 'mongoose';

export interface IGame extends Document {
    sessionId: string;
    status: string;
    creator: string;
    contractAddresses: {
        game: string;
        token: string;
    },
    players: string[];
    turns: string[];
    positions: Map<string, number>;
}

const GameSchema: Schema = new Schema({
    sessionId: { type: String, required: true, unique: true },
    status: { type: String, required: true },
    creator: { type: String, required: true },
    contractAddresses: {
        game: { type: String, required: false },
        token: { type: String, required: false }
    },
    players: {type: [String], required: false, default: [] },
    turns: { type: [Schema.Types.ObjectId], required: false, default: [] },
    positions: { type: Map, of: Number , required: false, default: {} },
});

export default mongoose.model<IGame>('Game', GameSchema);
