import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { MapboxService } from '../../services/mapbox.service';
import { TravelDataService } from '../../services/travel-data.service';
import { Subscription, combineLatest } from 'rxjs';

@Component({
  selector: 'app-three',
  templateUrl: './three.component.html',
  styleUrls: ['./three.component.css']
})
export class ThreeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapRef') mapRef!: ElementRef;
  private readonly token =
    'pk.eyJ1IjoiY29uZWN0YXZldC1jb20iLCJhIjoiY20ybDZpc2dmMDhpMDJpb21iZGI1Y2ZoaCJ9.WquhO_FA_2FM0vhYBaZ_jg';
  private subs = new Subscription();

  // Variables que se muestran en el HTML
  public origenTexto: string = '';
  public destinoTexto: string = '';

  constructor(
    private mapboxService: MapboxService,
    private travelData: TravelDataService,
    private cdr: ChangeDetectorRef // ✅ se usa para corregir el error NG0100
  ) {}

  ngAfterViewInit(): void {
    this.mapboxService.initMap(this.mapRef.nativeElement, this.token, [-74.0721, 4.7110]);

    const travelSub = combineLatest([
      this.travelData.origin$,
      this.travelData.destination$
    ]).subscribe(async ([origin, destination]) => {
      // Actualiza los textos para el HTML
      this.origenTexto = origin;
      this.destinoTexto = destination;
      this.cdr.detectChanges(); // ✅ Corrige ExpressionChangedAfterItHasBeenCheckedError

      if (origin && destination) {
        const originCoord = await this.geocodeAddress(origin);
        const destinationCoord = await this.geocodeAddress(destination);
        this.mapboxService.drawRoute(originCoord, destinationCoord, this.token);
      }
    });

    this.subs.add(travelSub);
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
