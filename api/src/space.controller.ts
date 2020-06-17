import express from 'express';
import { spaceService } from './space.service';

export const router = express.Router();

router.get('/', getAll);
router.get('/:id', getBySpaceId);

function getBySpaceId(req: express.Request, res: express.Response, next: express.NextFunction) {
    spaceService.getBySpaceId(+req.params.id).then((spaceDetails) => {
        res.json( spaceDetails );
    }).catch(err => next(err));
}

function getAll(req: express.Request, res: express.Response, next: express.NextFunction) {
    spaceService.getAll().then((spaces) => {
        res.json( spaces );
    }).catch(err => next(err));
}
