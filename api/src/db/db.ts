import mongoose, { Schema, Document } from 'mongoose';
import config from '../config.json';
import { EventEmitter } from 'events';
import logger from '../logger.service';

let isConnected = false;

export const dbEvents = new EventEmitter();

export const connect = () => {
    const dbURI = process.env.mongodb_uri || config.connectionString;
    const dbOptions = { server: { auto_reconnect: true }, useCreateIndex: true, useNewUrlParser: true };
    mongoose.connect(dbURI, dbOptions);
    mongoose.Promise = global.Promise;

    mongoose.connection
        .on('connecting', function() {
            logger.log('connecting to MongoDB...');
        }).on('error', function(error) {
            if (isConnected) {
                logger.error('Error in MongoDb connection: ' + error);
            }
            isConnected = false;
            mongoose.disconnect();
        }).on('connected', function() {
            logger.log('MongoDB connected!');
            isConnected = true;
            dbEvents.emit('connected');
        }).once('open', function() {
            logger.log('MongoDB connection opened!');
            isConnected = true;
        }).on('reconnected', function() {
            logger.log('MongoDB reconnected!');
            isConnected = true;
            dbEvents.emit('connected');
        }).on('disconnected', function() {
            logger.log('MongoDB disconnected!');
            logger.log(getStatus());
            isConnected = false;
            dbEvents.emit('disconnected');
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

export async function dropCollectionIfExist(collectionName: string): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
        await mongoose.connection.db.listCollections({name: collectionName})
        .next(async function(err, collInfo) {
            if (collInfo) {
                await mongoose.connection.db.dropCollection(collectionName, (err, result) => {
                    if (err) {
                        logger.error(`Error while dropping collection ${collectionName}:${err}`);
                        reject(err);
                    } else {
                        logger.log(`Collection ${collectionName} successfully dropped`);
                        resolve();
                    }
                });   
            } else {
                // collection does not exist
                resolve();
            }
        });
    });
}

