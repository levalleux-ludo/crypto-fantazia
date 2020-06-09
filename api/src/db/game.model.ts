import mongoose, { Schema, Document } from 'mongoose';

export interface IGame extends Document {
    sessionId: string;
    status: string;
    contractAddresses: {
        game: string;
        token: string;
    }
}

const GameSchema: Schema = new Schema({
    sessionId: { type: String, required: true, unique: true },
    status: { type: String, required: true },
    contractAddresses: {
        game: { type: String, required: false },
        token: { type: String, required: false }
    }
});

export default mongoose.model<IGame>('Game', GameSchema);
