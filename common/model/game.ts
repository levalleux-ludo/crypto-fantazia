export interface Game {
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
