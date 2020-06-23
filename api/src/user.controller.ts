import express from 'express';
import { userService } from './user.service';

export const router = express.Router();

router.get('/', getAll);
router.get('/:address', getByTezosAccountId);
router.post('/', create);

function getByTezosAccountId(req: express.Request, res: express.Response, next: express.NextFunction) {
    userService.getByTezosAccountId(req.params.address).then((userDetails) => {
        res.json( userDetails );
    }).catch(err => next(err));
}

function getAll(req: express.Request, res: express.Response, next: express.NextFunction) {
    userService.getAll().then((users) => {
        res.json( users );
    }).catch(err => next(err));
}

function create(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (!req.body) {
        throw new Error("body is required in request");
    }
    if (!req.body.userName) {
        throw new Error("'userName' field is required in request body");
    }
    if (!req.body.tezosAccountId) {
        throw new Error("'tezosAccountId' field is required in request body");
    }
    userService.create(req.body.userName as string, req.body.tezosAccountId as string).then((userDetails) => {
        res.json( userDetails );
    }).catch(err => next(err));
}

