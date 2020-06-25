import mongoose, { Schema, Document } from 'mongoose';
import { dropCollectionIfExist } from './db';

export interface IUserDetails extends Document {
    userName: string;
    tezosAccountId: string;
    avatar: string;
}

const UserSchema: Schema = new Schema({
    userName: { type: String, required: true },
    tezosAccountId: { type: String, required: true, unique: true },
    avatar: { type: String, default: 'nobody' }
});

export const User = mongoose.model<IUserDetails>('User', UserSchema);

