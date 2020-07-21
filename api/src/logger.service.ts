import { createLogger, format, transports, Logger as WinstonLogger } from 'winston';
import * as util from 'util';
import { path as appRoot } from 'app-root-path';

import * as fs from 'fs';
import path from 'path';

const { label, combine, timestamp , prettyPrint, json } = format;
const logFile = `${appRoot}/logs/app.log`;

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

const fileTransport = new transports.File(options.file);

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
            fs.readFile(path.join(fileTransport.dirname, fileTransport.filename), (err, data) => {
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