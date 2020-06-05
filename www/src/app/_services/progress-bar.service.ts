import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ProgressBarService {

  progressValue: number;
  max: number;
  displayValue: string;
  loopingIsHidden = true;
  progressIsHidden = true;

  constructor() { }

  setProgress(progressValue: number, max: number, displayValue?: string) {
    this.progressValue = progressValue,
    this.max = max;
    this.displayValue = displayValue ? displayValue : progressValue.toString();
    this.progressIsHidden = false;
  }

  hideProgress() {
    this.progressIsHidden = true;
  }

  showLooping() {
    this.loopingIsHidden = false;
  }

  hideLooping() {
    this.loopingIsHidden = true;
  }
}
