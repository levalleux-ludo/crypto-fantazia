import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

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

console.log('Hello World 2!');

// start the Express server
app.listen( port, () => {
    console.log( `server started at http://localhost:${ port }` );
} );
