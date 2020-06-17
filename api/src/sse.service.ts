import express, { Request, Response, NextFunction } from 'express';
import { EventEmitter } from 'events';

export enum eEventType {
    DEBUG = 'DEBUG',
    TURN_STARTED = 'TURN_STARTED',
    TURN_COMPLETED = 'TURN_COMPLETED'
}

class SessionEvent extends EventEmitter {
    history: any[] = [];
    constructor() {
        super();
    }
    get lastEventId() {
        return this.history.length;
    }
    notify(type: eEventType, data: any) {
        const event = {type, data, id: this.history.length};
        this.history.push(event);
        console.log('emit event of type', type);
        this.emit(type, event);
    }
    getFrom(from: number) {
        return this.history.slice(from);
    }
}

class SSEService {
    router = express.Router();
    events: Map<string, SessionEvent> = new Map();

    middleware = function (req: Request, res: any, next: NextFunction) {
        res.sseSetup = function() {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          })
        }
      
        res.sseSend = function(data: any) {
          res.write("data: " + JSON.stringify(data) + "\n\n");
        }
      
        next()
      }

    constructor() {
        this.router.get('/:sessionId', this.middleware, (req: Request, res: any) => {
            res.sseSetup();
            // const response = res as ISseResponse;
            const sessionId = req.params.sessionId;
            let messageId = parseInt(req.header('Last-Event-ID') as string, 10) || 0;
            const sessionEvent = this.getSessionEvent(sessionId);
            for (let eventType of [eEventType.DEBUG, eEventType.TURN_STARTED, eEventType.TURN_COMPLETED]) {
                sessionEvent.on(eventType, (event) => {
                    console.log(`broadcast ${eventType} event ${JSON.stringify(event)} to clients`);
                    res.sseSend(event);
                });
            }
            const history = sessionEvent.getFrom(messageId);
            console.log('New client connected to session event');
            console.log(`send history to new client: ${history.length} events`)
            for (let event of history) {
                res.sseSend(event);
            }
        });
    }

    private getSessionEvent(sessionId: string): SessionEvent {
        if (!this.events.has(sessionId)) {
            this.events.set(sessionId, new SessionEvent());
        }
        return this.events.get(sessionId) as SessionEvent;
    }

    public notify(sessionId: string, eventType: eEventType, data: any) {
        this.getSessionEvent(sessionId).notify(eventType, data);
    }

}

export const sseService = new SSEService();