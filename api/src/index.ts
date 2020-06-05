import express from 'express';

// const express = require( "express" );
const app = express();
const port = 8080; // default port to listen

app.get( "/", ( req: express.Request, res: express.Response ) => {
    console.log('GET', req.body);
    res.send( "Hello world 2!" );
} );

console.log('Hello World 2!');

// start the Express server
app.listen( port, () => {
    console.log( `server started at http://localhost:${ port }` );
} );
