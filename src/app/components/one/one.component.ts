import { Component, OnInit } from '@angular/core';
import { TravelDataService } from '../../services/travel-data.service';
import { MapboxService } from '../../services/mapbox.service';
import { VirtualRouterService } from '../../services/virtual-router.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  Directive, ElementRef, HostListener, Input, Renderer2, OnDestroy
} from '@angular/core';

@Directive({
  selector: '[tooltip]'
})

export class TooltipDirective implements OnDestroy {
  private tooltipElement: HTMLElement;

  constructor(
    private elementRef: ElementRef,
    private renderer: Renderer2
  ) {
    this.tooltipElement = this.renderer.createElement('div');
    this.tooltipElement.classList.add('tooltip-text');
    this.tooltipElement.textContent = this.elementRef.nativeElement.getAttribute('tooltip');
    this.renderer.appendChild(this.elementRef.nativeElement, this.tooltipElement);
  }

  @HostListener('mouseenter') onMouseEnter() {
    this.tooltipElement.style.display = 'block';
  }

  @HostListener('mouseleave') onMouseLeave() {
    this.tooltipElement.style.display = 'none';
  }

  ngOnDestroy() {
    this.renderer.removeChild(this.elementRef.nativeElement, this.tooltipElement);
  }
}
@Component({
  selector: 'app-one',
  imports: [FormsModule
    ,CommonModule
  ],
  templateUrl: './one.component.html',
  styleUrls: ['./one.component.css']
})
export class OneComponent implements OnInit {
  tipoServicio: 'aeropuerto' | 'punto' | 'hora' | undefined;
  vehiculoSeleccionado: string = 'sedan';
  vehiculos = [
    { tipo: 'sedan', nombre: 'Sedán', img: 'assets/img/vehiculos/sedan.png' },
    { tipo: 'minivan', nombre: 'Miniván', img: 'assets/img/vehiculos/minivan.png' },
    { tipo: 'suv', nombre: 'SUV', img: 'assets/img/vehiculos/suv.png' },
    { tipo: 'minibus', nombre: 'Minibús', img: 'assets/img/vehiculos/minibus.png' }
  ];
  
  // Comunes
  origin = '';
  destination = '';
  passengerCount = 1;

  // Solo aeropuerto
  fechaIda = '';
  horaIda = '';
  fechaVuelta = '';
  horaVuelta = '';
  numeroVuelo = '';
  tipoViaje: 'solo_ida' | 'ida_vuelta' = 'solo_ida';
// Change this:
horasContratadas = 2; // mínimo 2

// To this:
duracionHoras = 2; // mínimo 2

  tiempoRestanteSegundos: number = 0;
  private tiempoValidezMinutos = 5;
  private temporizadorInterval!: any;

  originSuggestions: string[] = [];
  destinationSuggestions: string[] = [];
  private readonly token = 'pk.eyJ1IjoiY29uZWN0YXZldC1jb20iLCJhIjoiY20ybDZpc2dmMDhpMDJpb21iZGI1Y2ZoaCJ9.WquhO_FA_2FM0vhYBaZ_jg';

  seleccionarVehiculo(tipo: string) {
    this.vehiculoSeleccionado = tipo;
  }
  
  // Activa el estilo según la lógica de cantidad de pasajeros
  vehiculoDisponible(tipo: string): boolean {
    switch (tipo) {
      case 'sedan': return this.passengerCount <= 3;
      case 'minivan': return this.passengerCount >= 4 && this.passengerCount <= 6;
      case 'suv': return this.passengerCount === 7;
      case 'minibus': return this.passengerCount >= 8;
      default: return false;
    }
  }
  
  constructor(
    private travelData: TravelDataService,
    private mapboxService: MapboxService,
    public virtualRouterService: VirtualRouterService
  ) {}

  ngOnInit() {
    this.recuperarDatosGuardados();
  }

  increaseCount() {
    if (this.passengerCount < 20) this.passengerCount++;
  }

  decreaseCount() {
    if (this.passengerCount > 1) this.passengerCount--;
  }

  async onOriginInput() {
    if (this.origin.length > 2) {
      const results = await this.mapboxService.searchPlaces(this.origin, this.token);
      this.originSuggestions = results.map(f => f.place_name);
    } else {
      this.originSuggestions = [];
    }
  }

 
  
  // Activa el estilo según la lógica de cantidad de pasajeros

  async onDestinationInput() {
    if (this.destination.length > 2) {
      const results = await this.mapboxService.searchPlaces(this.destination, this.token);
      this.destinationSuggestions = results.map(f => f.place_name);
    } else {
      this.destinationSuggestions = [];
    }
  }

  selectOrigin(place: string) {
    this.origin = place;
    this.originSuggestions = [];
  }

  selectDestination(place: string) {
    this.destination = place;
    this.destinationSuggestions = [];
  }

  onSubmit() {
    const data: any = {
      tipoServicio: this.tipoServicio,
      origin: this.origin,
      destination: this.destination,
      passengerCount: this.passengerCount,
      timestamp: new Date().getTime()
    };

    if (this.tipoServicio === 'aeropuerto') {
      data.fechaIda = this.fechaIda;
      data.horaIda = this.horaIda;
      data.fechaVuelta = this.fechaVuelta;
      data.horaVuelta = this.horaVuelta;
      data.numeroVuelo = this.numeroVuelo;
      data.tipoViaje = this.tipoViaje;
    }

    if (this.tipoServicio === 'hora') {
      data.horasContratadas = this.horasContratadas;
    }

    // Guarda en servicio y localStorage
    this.travelData.setTravelData(data.origin, data.destination);
    localStorage.setItem('datosCotizador', JSON.stringify(data));

    this.iniciarTemporizador();
  }

  iniciarTemporizador() {
    this.tiempoRestanteSegundos = this.tiempoValidezMinutos * 60;

    if (this.temporizadorInterval) {
      clearInterval(this.temporizadorInterval);
    }

    this.temporizadorInterval = setInterval(() => {
      this.tiempoRestanteSegundos--;
      if (this.tiempoRestanteSegundos <= 0) {
        clearInterval(this.temporizadorInterval);
        this.expirarCotizacion();
      }
    }, 1000);
  }

  expirarCotizacion() {
    localStorage.removeItem('datosCotizador');
    alert('⚠️ La cotización ha expirado. Por favor, vuelve a ingresarla.');
    location.reload();
  }

  recuperarDatosGuardados() {
    const dataRaw = localStorage.getItem('datosCotizador');
    if (!dataRaw) return;

    const data = JSON.parse(dataRaw);

    const ahora = new Date().getTime();
    const transcurrido = (ahora - data.timestamp) / 1000;

    if (transcurrido > this.tiempoValidezMinutos * 60) {
      this.expirarCotizacion();
      return;
    }

    this.tipoServicio = data.tipoServicio;
    this.origin = data.origin;
    this.destination = data.destination;
    this.passengerCount = data.passengerCount;

    if (this.tipoServicio === 'aeropuerto') {
      this.fechaIda = data.fechaIda;
      this.horaIda = data.horaIda;
      this.fechaVuelta = data.fechaVuelta;
      this.horaVuelta = data.horaVuelta;
      this.numeroVuelo = data.numeroVuelo;
      this.tipoViaje = data.tipoViaje;
    }

    if (this.tipoServicio === 'hora') {
      this.horasContratadas = data.horasContratadas;
    }

    this.tiempoRestanteSegundos = this.tiempoValidezMinutos * 60 - transcurrido;
    this.iniciarTemporizador();
  }
  selectVehicle(vehicle: string) {
  
    this.horasContratadas = 2;
  }
}
