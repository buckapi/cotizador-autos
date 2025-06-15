import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';
import { MapboxService } from '../../services/mapbox.service';
import { TravelDataService } from '../../services/travel-data.service';
import { Subscription, combineLatest } from 'rxjs';
import { CotizadorService } from '../../services/cotizador.service';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-three',
  imports: [CommonModule],
  templateUrl: './three.component.html',
  styleUrls: ['./three.component.css']
})
export class ThreeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapRef') mapRef!: ElementRef;
  tarifaTotal: number = 0;

  private readonly token =
    'pk.eyJ1IjoiY29uZWN0YXZldC1jb20iLCJhIjoiY20ybDZpc2dmMDhpMDJpb21iZGI1Y2ZoaCJ9.WquhO_FA_2FM0vhYBaZ_jg';
  private subs = new Subscription();

  // Variables que se muestran en el HTML
  public origenTexto: string = '';
  public destinoTexto: string = '';
  public distanciaKm: number = 0;

  constructor(
    private mapboxService: MapboxService,
    private cotizadorService: CotizadorService,
    private travelData: TravelDataService,
    public cdr: ChangeDetectorRef // ✅ se usa para corregir el error NG0100
  ) {}

  // async ngAfterViewInit() {
  //   this.mapboxService.initMap(this.mapRef.nativeElement, this.token, [-74.0721, 4.7110]);
  
  //   const travelSub = combineLatest([
  //     this.travelData.origin$,
  //     this.travelData.destination$
  //   ]).subscribe(async ([origin, destination]) => {
  //     this.origenTexto = origin;
  //     this.destinoTexto = destination;
  
  //     if (origin && destination) {
  //       const originCoord = await this.geocodeAddress(origin);
  //       const destinationCoord = await this.geocodeAddress(destination);
  
  //       // ✅ Ahora sí puedes pasar las coords al servicio
  //       this.distanciaKm = await this.mapboxService.drawRoute(originCoord, destinationCoord, this.token);
  //     }
  //   });
  
  //   this.subs.add(travelSub);
  // }
  async ngAfterViewInit() {
    this.mapboxService.initMap(this.mapRef.nativeElement, this.token, [-74.0721, 4.7110]);
  
    const travelSub = combineLatest([
      this.travelData.origin$,
      this.travelData.destination$
    ]).subscribe(async ([origin, destination]) => {
      this.origenTexto = origin;
      this.destinoTexto = destination;
    this.cdr.detectChanges();
      if (origin && destination) {
        const originCoord = await this.geocodeAddress(origin);
        const destinationCoord = await this.geocodeAddress(destination);
      
        this.mapboxService.setMarkersAndDrawRoute(
          originCoord,
          destinationCoord,
          this.token,
          (distanceKm: number, originText: string, destinationText: string) => {
            this.distanciaKm = distanceKm;
            this.origenTexto = originText;
            this.destinoTexto = destinationText;
          }
        );
      }
    });
  
    this.subs.add(travelSub);
  }
  ngOnInit() {
    this.cotizadorService.tarifaTotal$.subscribe(valor => {
      this.tarifaTotal = valor;
    });
    this.cotizadorService.distanciaKm$.subscribe(km => {
      this.distanciaKm = km;
    });
  }
  
  async geocodeAddress(address: string): Promise<[number, number]> {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        address
      )}.json?access_token=${this.token}`
    );
    const data = await response.json();
    return data.features[0].center;
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
