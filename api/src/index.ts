import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { router as gameController } from './game.controller';
import { router as cardController } from './card.controller';
import { router as spaceController } from './space.controller';
import { connect } from './db/db';
import { sseService } from './sse.service';

// const express = require( "express" );
const app = express();
const port = 8080; // default port to listen

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

app.get( "/", ( req: express.Request, res: express.Response ) => {
    console.log('GET', req.body);
    res.send( { "message": "Hello world 2!" } );
} );

app.use('/game', gameController);
app.use('/events', sseService.router);
app.use('/card', cardController);
app.use('/space', spaceController);

console.log('Hello World 2!');
console.log("TEZOS_ACCOUNTS_DIR", process.env.TEZOS_ACCOUNTS_DIR);

// connect to DB
connect();

// start the Express server
app.listen( port, () => {
    console.log( `server started at http://localhost:${ port }` );
} );

