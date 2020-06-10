import express from 'express';
import { gameService } from './game.service';

export const router = express.Router();

// routes
router.post('/create', create);
router.get('/', getAll);
router.get('/:sessionId', getBySessionId);


function create(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (!req.body) {
        throw new Error("body is required in request");
    }
    if (!req.body.creator) {
        throw new Error("'creator' field is required in request body");
    }
    gameService.create(req.body.creator as string).then((gameCreationResponseData) => {
        res.json( gameCreationResponseData );
    }).catch(err => next(err));
}

function getBySessionId(req: express.Request, res: express.Response, next: express.NextFunction) {
    gameService.load(req.params.sessionId).then((gameCreationResponseData) => {
        res.json( gameCreationResponseData );
    }).catch(err => next(err));
}

function getAll(req: express.Request, res: express.Response, next: express.NextFunction) {
    gameService.getAll().then((games) => {
        res.json( games );
    }).catch(err => next(err));
}
