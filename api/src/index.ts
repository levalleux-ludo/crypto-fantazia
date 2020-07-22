import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { router as gameController } from './game.controller';
import { router as cardController } from './card.controller';
import { router as spaceController } from './space.controller';
import { router as userController } from './user.controller';
import { connect } from './db/db';
import { sseService } from './sse.service';
import logger from './logger.service';
import * as os from 'os';


function replaceAll(target: string, search: string, replacement: string): string {
    return target.split(search).join(replacement);
};

// const express = require( "express" );
const app = express();
const port = 4444; // default port to listen

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
app.get( "/", ( req: express.Request, res: express.Response ) => {
    logger.log('GET', req.body);
    // res.send( { "message": "Hello world 2!" } );
    logger.getAll().then((logs) => {
        // logs =  replaceAll(logs.toString('utf-8'), '}' + os.EOL + '{', '},{' );
        // logs = '{"messages":[' + logs  + ']}';
        const obj = JSON.parse(logs);
        const messages = obj.reverse();
        const html_rows = messages.map((element: any) => `<tr><td>${element.timestamp}</td><td>${element.level}</td><td>${element.message}</td></tr>`).join('');
        res.send(`<html><body><h1>Logs</h1><table><thead>
        <th style="width: 200px;">TimeStamp</th>
        <th>Level</th>
        <th>Message</th>
    </thead>${html_rows}</table></body></html>` );
    });
} );

app.use('/game', gameController);
app.use('/events', sseService.router);
app.use('/card', cardController);
app.use('/space', spaceController);
app.use('/user', userController);

logger.log('***************************************');
logger.log('Hello World!');
logger.log("TEZOS_ACCOUNTS_DIR", process.env.TEZOS_ACCOUNTS_DIR);

// connect to DB
connect();

// start the Express server
app.listen( port, () => {
    logger.log( `server started at http://localhost:${ port }` );
} );

