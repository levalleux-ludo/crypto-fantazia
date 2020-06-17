import { expect } from "chai";
import { gameService } from "../src/game.service";
import { originator } from "../../tezos/src/token.service";
import { connect } from '../src/db/db';
import { IGame } from "../src/db/game.model";

const gameCreator = originator;

const gameContractAddress = 'KT1Si3182DzP3CocFhFqewugVEBdimLrN7tm';

before(async () => {
    await connect();
})

describe('Dummy test', function() {
    it('test true', function() {
      expect(true).to.be.true;
    }); 
});

let game: IGame;
let status = undefined;
describe('New game without contract', () => {
    it('create game', (done) => {
        gameService.create(gameCreator, false).then((game) => {
            expect(game).not.to.be.undefined;
            game = game;
            done();
        });
    });
});