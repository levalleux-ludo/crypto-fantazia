import mongoose, { Schema, Document } from 'mongoose';
import config from '../config.json';
// var events = require('events');
// var eventEmitter = new events.EventEmitter();

let isConnected = false;

export const connect = () => {
    const dbURI = process.env.mongodb_uri || config.connectionString;
    const dbOptions = { server: { auto_reconnect: true }, useCreateIndex: true, useNewUrlParser: true };
    mongoose.connect(dbURI, dbOptions);
    mongoose.Promise = global.Promise;

    mongoose.connection
        .on('connecting', function() {
            console.log('connecting to MongoDB...');
        }).on('error', function(error) {
            if (isConnected) {
                console.error('Error in MongoDb connection: ' + error);
            }
            isConnected = false;
            mongoose.disconnect();
        }).on('connected', function() {
            console.log('MongoDB connected!');
            isConnected = true;
            // eventEmitter.emit('connected');
        }).once('open', function() {
            console.log('MongoDB connection opened!');
            isConnected = true;
        }).on('reconnected', function() {
            console.log('MongoDB reconnected!');
            isConnected = true;
            // eventEmitter.emit('connected');
        }).on('disconnected', function() {
            console.log('MongoDB disconnected!');
            console.log(getStatus());
            isConnected = false;
            // eventEmitter.emit('disconnected');
            mongoose.connect(dbURI, dbOptions);
        });

}

export function getStatus() {
    return {
        connected: isConnected,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name
    }
}

connect();