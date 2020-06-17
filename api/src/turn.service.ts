import Turn, { ITurn } from './db/turn.model';

class TurnService {
    async create(sessionId: string, player: string, oldPosition: number, newPosition: number, dices: number[], cardId: number, signature: string): Promise<ITurn> {
        return new Promise(async (resolve, reject) => {
            try {
                const turnId = await Turn.countDocuments();
                const turn = new Turn({
                    turnId,
                    sessionId,
                    player,
                    oldPosition,
                    newPosition,
                    dices,
                    cardId,
                    signature
                });
                await turn.save();
                resolve(turn);
            } catch (err) {
                reject(err)
            }
        });
    }
}

export const turnService = new TurnService();