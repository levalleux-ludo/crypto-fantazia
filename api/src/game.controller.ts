import express from 'express';
import { gameService } from './game.service';

export const router = express.Router();

// routes
router.post('/create', create);

function create(req: express.Request, res: express.Response, next: express.NextFunction) {
    gameService.create().then((gameCreationResponseData) => {
        res.json( gameCreationResponseData );
    }).catch(err => next(err));
}