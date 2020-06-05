import { v4 as uuid } from 'uuid';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WaiterService {

  _isWaiting: boolean = false;
  _tasks: Map<string, string> = new Map<string, string>();

  constructor() { }

  public get isWaiting() {
    return this._isWaiting;
  }

  public init() {
    this._tasks = new Map<string, string>();
  }

  public addTask(): string {
    const id = uuid();
    this._tasks.set(id, id);
    if (this._tasks.size === 1) {
      this.startWaiting();
    }
    return id;
  }

  public removeTask(id: string) {
    this._tasks.delete(id);
    console.log("ENDING TASK ", id);
    if (this._tasks.size === 0) {
      this.stopWaiting();
    }
  }

  private stopWaiting() {
    console.log("STOP WAITING");
    this._isWaiting = false;
  }

  private startWaiting() {
    console.log("START WAITING");
    this._isWaiting = true;
  }
}
