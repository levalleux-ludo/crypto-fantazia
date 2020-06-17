import express from 'express';
import { cardService, eCardType } from './card.service';

export const router = express.Router();

router.get('/chance', getAllChances);
router.get('/chance/:id', getChanceByCardId);
router.get('/cc', getAllCCs);
router.get('/cc/:id', getCCByCardId);

function getChanceByCardId(req: express.Request, res: express.Response, next: express.NextFunction) {
    cardService.getByCardId(eCardType.CHANCE , +req.params.id).then((cardDetails) => {
        res.json( cardDetails );
    }).catch(err => next(err));
}

function getAllChances(req: express.Request, res: express.Response, next: express.NextFunction) {
    cardService.getAll(eCardType.CHANCE).then((cards) => {
        res.json( cards );
    }).catch(err => next(err));
}

function getCCByCardId(req: express.Request, res: express.Response, next: express.NextFunction) {
    cardService.getByCardId(eCardType.COMMUNITY_CHEST , +req.params.id).then((cardDetails) => {
        res.json( cardDetails );
    }).catch(err => next(err));
}

function getAllCCs(req: express.Request, res: express.Response, next: express.NextFunction) {
    cardService.getAll(eCardType.COMMUNITY_CHEST).then((cards) => {
        res.json( cards );
    }).catch(err => next(err));
}

