import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CotizadorService {
  private tarifaTotalSubject = new BehaviorSubject<number>(0);
  private distanciaKmSubject = new BehaviorSubject<number>(0);

  tarifaTotal$ = this.tarifaTotalSubject.asObservable();
  distanciaKm$ = this.distanciaKmSubject.asObservable();

  setTarifaTotal(valor: number) {
    this.tarifaTotalSubject.next(valor);
  }

  setDistanciaKm(km: number) {
    this.distanciaKmSubject.next(km);
  }
}
