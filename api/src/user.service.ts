import { dbEvents } from "./db/db";
import { User, IUserDetails } from "./db/user.model";
import { GameConfig } from "./game.service";
import { use } from "chai";

class UserService {
    constructor() {
    }

    async getAll(): Promise<IUserDetails[]> {
        return await User.find();
    }

    async getByTezosAccountId(tezosAccountId: string): Promise<IUserDetails | null> {
        return await User.findOne({tezosAccountId: tezosAccountId});
    }

    async create(userName: string, tezosAccountId: string, avatar: string) {
        let user = await User.findOne({tezosAccountId: tezosAccountId});
        if (user) {
            user.userName = userName;
            user.avatar = avatar;
        } else {
            user = new User({
                userName: userName,
                tezosAccountId: tezosAccountId,
                avatar: avatar
            });
        }
        await user.save();
        return user;
    }

}

export const userService = new UserService();