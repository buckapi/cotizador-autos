// travel-data.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TravelDataService {
  private originSubject = new BehaviorSubject<string>('Bogotá');
  private destinationSubject = new BehaviorSubject<string>('Cartagena');

  origin$ = this.originSubject.asObservable();
  destination$ = this.destinationSubject.asObservable();

  setTravelData(origin: string, destination: string) {
    this.originSubject.next(origin);
    this.destinationSubject.next(destination);
  }
}
