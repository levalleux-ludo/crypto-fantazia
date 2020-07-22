import { createLogger, format, transports, Logger as WinstonLogger } from 'winston';
import  Transport from 'winston-transport';
import * as util from 'util';
import { path as appRoot } from 'app-root-path';

import * as fs from 'fs';
import path from 'path';
import winston from 'winston/lib/winston/config';

const { label, combine, timestamp , prettyPrint, json, printf } = format;
const logFile = `${appRoot}/logs/app.log`;


const myFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
  });

var options = {
    file: {
      level: 'info',
      filename: logFile,
      handleExceptions: true,
    //   json: true,
      maxsize: 65535,
      maxFiles: 1,
      colorize: false
    },
    console: {
      level: 'debug',
      handleExceptions: true,
      json: false,
      colorize: true,
    },
  };

class jsonTransport extends Transport {

    public filename: string;
    constructor(opts: any) {
        super(opts);
        this.filename = opts.filename;
        this.setup();
    }
    
    initialize() {
        try {
            fs.writeFileSync(this.filename, JSON.stringify([]), 'utf8');
        } catch (error) {
            console.log(error);
        }
    }

    setup() {
        // This checks if the file exists
        if (fs.existsSync(this.filename)) {
            // The content of the file is checked to know if it is necessary to adapt the array
            try {
                const data = fs.readFileSync(this.filename, 'utf8');
                // If the content of the file is not an array, it is set
                const content = JSON.parse(data);
                if (!Array.isArray(content)) {
                    this.initialize();
                }
            } catch (error) {
                this.initialize();
                console.log(error);
            }
        }
        // Otherwise create the file with the desired format
        else {
            this.initialize();
        }
    }

    readLog() {
        let data = null;
        try {
            data = fs.readFileSync(this.filename, 'utf8');
        } catch (error) {

            console.log(error);
        }
        return data;
    }

    writeLog(info: any) {
        const data = this.readLog();
        let arr = [];
        if (data) {
            arr = JSON.parse(data);
        }
        //add data
        arr.push(info);
        //convert it back to json
        const json = JSON.stringify(arr);
        try {
            // Writing the array again
            fs.writeFileSync(this.filename, json, 'utf8');
        } catch (error) {
            console.log(error)
        }
    }

    log(info: any, next: () => void) {
        setImmediate(() => {
            this.emit('logged', info);
        });
        // Perform the writing
        this.writeLog(info);

        next();
    }
}

const fileTransport = new jsonTransport(options.file);

class Logger {
    protected logger: WinstonLogger;
    constructor() {
        this.logger = createLogger({
            format: combine(timestamp(), prettyPrint(), json()),
            transports: [
                fileTransport,
            ],
            exitOnError: false
        });
        if (process.env.NODE_ENV !== 'production') {
            this.logger.add(new transports.Console(options.console));
        }
        this.log('process.env.NODE_ENV', process.env.NODE_ENV);
    }
    public log(data: any, ...args: any[]) {
        const message = util.format.apply(null, [data, args]);
        this.logger.log({
            level: 'info',
            message
          });
    }
    public warn(data: any, ...args: any[]) {
        const message = util.format.apply(null, [data, args]);
        this.logger.log({
            level: 'warning',
            message
          });
    }
    public error(message: string) {
        this.logger.log({
            level: 'error',
            message
          });
    }
    public async getAll(): Promise<any> {
        return new Promise((resolve, reject) => {
            const now = Date.now();
            fs.readFile(fileTransport.filename, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
            // 
            // this.logger.query(undefined, (err, results) => {
            //     if (err) {
            //         reject(err);
            //     } else {
            //         resolve(results.file);
            //     }
            // })
        })
    }
}

const logger = new Logger()

export default logger;