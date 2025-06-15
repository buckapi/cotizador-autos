import { Component, OnInit } from '@angular/core';
import { TravelDataService } from '../../services/travel-data.service';
import { MapboxService } from '../../services/mapbox.service';
import { VirtualRouterService } from '../../services/virtual-router.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { FeatureCollection, Point } from 'geojson';
import { CotizadorService } from '../../services/cotizador.service';

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

  readonly MAX_PERSONAS = 16;
  readonly MAX_MALETAS = 18;
  readonly coordenadasAeropuertoCuliacan: [number, number] = [-107.4702, 24.7645];
readonly nombreAeropuerto = 'Aeropuerto de Culiacán';

  excesoLimite = false; // Para mostrar u ocultar el aviso

  tipoServicio: 'aeropuerto' | 'punto' | 'hora' | undefined;
  vehiculoSeleccionado: string = 'sedan';
  vehiculos = [
    { tipo: 'sedan', nombre: 'Sedán', img: 'assets/img/vehiculos/sedan.png' },
    { tipo: 'minivan', nombre: 'Miniván', img: 'assets/img/vehiculos/minivan.png' },
    { tipo: 'suv', nombre: 'SUV', img: 'assets/img/vehiculos/suv.png' },
    { tipo: 'minibus', nombre: 'Bus 12', img: 'assets/img/vehiculos/bus12.png' },
    { tipo: 'minibus16', nombre: 'Bus 16', img: 'assets/img/vehiculos/bus16.png' }
  ];
  
  
  // Comunes
  origin = '';
  destination = '';
  passengerCount = 1;
maletaCount = 0;

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
  tiempoValidezMinutos: number = 5;
  private temporizadorInterval!: any;

  originSuggestions: string[] = [];
  destinationSuggestions: string[] = [];
  private readonly token = 'pk.eyJ1IjoiY29uZWN0YXZldC1jb20iLCJhIjoiY20ybDZpc2dmMDhpMDJpb21iZGI1Y2ZoaCJ9.WquhO_FA_2FM0vhYBaZ_jg';

  seleccionarVehiculo(tipo: string) {
    this.vehiculoSeleccionado = tipo;
  }
  

  
  
  vehiculoDisponible(tipo: string): boolean {
    return tipo === this.getVehiculoRecomendado();
  }
  
  constructor(
    private travelData: TravelDataService,
    private mapboxService: MapboxService,
    public virtualRouterService: VirtualRouterService,
    public cotizadorService: CotizadorService
  ) {}

  ngOnInit() {
    this.recuperarDatosGuardados();
  }
  increaseMaletaCount() {
    if (this.maletaCount < this.MAX_MALETAS) {
      this.maletaCount++;
      if (this.maletaCount === this.MAX_MALETAS) {
        this.mostrarAlerta('maletas');
      }
    }
  }
  mostrarAlerta(tipo: 'pasajeros' | 'maletas') {
    const mensaje = tipo === 'pasajeros'
      ? 'La cantidad máxima permitida de pasajeros es de 16.'
      : 'La cantidad máxima permitida de maletas es de 18.';
  
    Swal.fire({
      icon: 'warning',
      title: 'Límite alcanzado',
      text: mensaje,
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#d6c500' 
    });
  }
    
  
  increaseCount() {
    if (this.passengerCount < this.MAX_PERSONAS) {
      this.passengerCount++;
      if (this.passengerCount === this.MAX_PERSONAS) {
        this.mostrarAlerta('pasajeros');
      }
    }
  }
  
  decreaseCount() {
    if (this.passengerCount > 1) {
      this.passengerCount--;
    }
    this.verificarLimites();
  }
  
  decreaseMaletaCount() {
    if (this.maletaCount > 0) {
      this.maletaCount--;
    }
    this.verificarLimites();
  }
  verificarLimites() {
    if (this.passengerCount > this.MAX_PERSONAS || this.maletaCount > this.MAX_MALETAS) {
      Swal.fire({
        icon: 'warning',
        title: 'Límite excedido',
        text: 'Has superado el máximo de 16 pasajeros o 18 maletas. Por favor, ajusta los valores.',
        confirmButtonText: 'Entendido'
      });
  
      // Corrige automáticamente el valor excedido
      if (this.passengerCount > this.MAX_PERSONAS) {
        this.passengerCount = this.MAX_PERSONAS;
      }
      if (this.maletaCount > this.MAX_MALETAS) {
        this.maletaCount = this.MAX_MALETAS;
      }
    }
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
      maletaCount: this.maletaCount,
      timestamp: new Date().getTime()
    };
  
    let tarifaTotal = 0;
  
    if (this.tipoServicio === 'aeropuerto') {
      data.fechaIda = this.fechaIda;
      data.horaIda = this.horaIda;
      data.fechaVuelta = this.fechaVuelta;
      data.horaVuelta = this.horaVuelta;
      data.numeroVuelo = this.numeroVuelo;
      data.tipoViaje = this.tipoViaje;
  
      // Aquí puedes estimar una distancia promedio o usar una API real de distancia
      tarifaTotal = this.calcularTarifaDistancia(25); // ejemplo: 25 km
    }
  
    if (this.tipoServicio === 'punto') {
      tarifaTotal = this.calcularTarifaDistancia(25); // distancia ficticia o real desde Mapbox
    }
  
    if (this.tipoServicio === 'hora') {
      data.horasContratadas = this.horasContratadas;
      tarifaTotal = this.calcularTarifaHora();
    }
  
    data.tarifaTotal = tarifaTotal;
  
    // Mostrar tarifa al usuario
    Swal.fire({
      icon: 'info',
      title: 'Tarifa estimada',
      html: `El costo aproximado es <strong>$${tarifaTotal.toLocaleString('es-MX')}</strong>`,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#d6c500'
    });
  
    // Guarda en servicio y localStorage
    this.travelData.setTravelData(data.origin, data.destination);
    localStorage.setItem('datosCotizador', JSON.stringify(data));
  
    this.iniciarTemporizador();
  }
  
  // onSubmit() {
    
  //   const data: any = {
  //     tipoServicio: this.tipoServicio,
  //     origin: this.origin,
  //     destination: this.destination,
  //     passengerCount: this.passengerCount,
  //     maletaCount: this.maletaCount,
  //     timestamp: new Date().getTime()
  //   };

  //   if (this.tipoServicio === 'aeropuerto') {
  //     data.fechaIda = this.fechaIda;
  //     data.horaIda = this.horaIda;
  //     data.fechaVuelta = this.fechaVuelta;
  //     data.horaVuelta = this.horaVuelta;
  //     data.numeroVuelo = this.numeroVuelo;
  //     data.tipoViaje = this.tipoViaje;
  //   }

  //   if (this.tipoServicio === 'hora') {
  //     data.horasContratadas = this.horasContratadas;
  //   }

  //   // Guarda en servicio y localStorage
  //   this.travelData.setTravelData(data.origin, data.destination);
  //   localStorage.setItem('datosCotizador', JSON.stringify(data));

  //   this.iniciarTemporizador();
  // }
  seleccionarTipoServicio(tipo: 'aeropuerto' | 'punto' | 'hora') {
    this.tipoServicio = tipo;
  
    if (tipo === 'aeropuerto') {
      this.setOrigenDesdeAeropuerto();
    }
  }
  setOrigenDesdeAeropuerto(): void {
    this.origin = this.nombreAeropuerto;
  
    if (this.mapboxService?.map && this.mapboxService.map.getSource('origen')) {
      const origenFeature: FeatureCollection<Point> = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: this.coordenadasAeropuertoCuliacan
            },
            properties: {
              title: this.nombreAeropuerto
            }
          }
        ]
      };
  
      const source = this.mapboxService.map.getSource('origen') as mapboxgl.GeoJSONSource;
      source.setData(origenFeature);
  
      this.mapboxService.map.flyTo({
        center: this.coordenadasAeropuertoCuliacan,
        zoom: 14
      });
    }
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
    Swal.fire({
      icon: 'warning',
      title: 'Tiempo expirado',
      text: 'Se ha agotado el tiempo de validez de 5 minutos para completar la cotización. Por favor, vuelve a ingresarla.',
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#d6c500'
    }).then(() => {
      location.reload();
    });
  }
  

  
  recuperarDatosGuardados() {
    const dataRaw = localStorage.getItem('datosCotizador');
    if (!dataRaw) return;
    

    const data = JSON.parse(dataRaw);

    const ahora = new Date().getTime();
    this.maletaCount = data.maletaCount || 0;

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
  getVehiculoRecomendado(): string {
    const personas = this.passengerCount;
    const maletas = this.maletaCount;
  
    const capacidades = [
      { tipo: 'sedan', maxPersonas: 3, maxMaletas: 3 },
      { tipo: 'minivan', maxPersonas: 6, maxMaletas: 6 },
      { tipo: 'suv', maxPersonas: 7, maxMaletas: 7 },
      { tipo: 'minibus', maxPersonas: 12, maxMaletas: 12 },
      { tipo: 'minibus16', maxPersonas: 16, maxMaletas: 16 }
    ];
  
    for (let v of capacidades) {
      if (personas <= v.maxPersonas && maletas <= v.maxMaletas) {
        return v.tipo;
      }
    }
  
    return 'minibus16'; // fallback si todo falla
  }
  
  
  selectVehicle(vehicle: string) {
  
    this.horasContratadas = 2;
  }
  // Tarifas por hora
tarifasHora = [
  { tipo: 'sedan', base: 1500, adicional: 750 },
  { tipo: 'minivan', base: 2898, adicional: 1449 },
  { tipo: 'suv', base: 6356, adicional: 3178 },
  { tipo: 'minibus', base: 7950, adicional: 3975 },
  { tipo: 'minibus16', base: 8960, adicional: 4480 }
];

// Tarifas por distancia
tarifasDistancia = [
  { tipo: 'sedan', base: 650, adicionalKm: 22 },
  { tipo: 'minivan', base: 1100, adicionalKm: 34 },
  { tipo: 'suv', base: 2100, adicionalKm: 49 },
  { tipo: 'minibus', base: 3500, adicionalKm: 64 },
  { tipo: 'minibus16', base: 5100, adicionalKm: 79 }
];
calcularTarifaHora(): number {
  const tarifa = this.tarifasHora.find(t => t.tipo === this.vehiculoSeleccionado);
  if (!tarifa) return 0;

  const horasExtras = Math.max(0, this.horasContratadas - 2);
  return tarifa.base + (horasExtras * tarifa.adicional);
}

calcularTarifaDistancia(km: number): number {
  const tarifa = this.tarifasDistancia.find(t => t.tipo === this.vehiculoSeleccionado);
  if (!tarifa) return 0;

  const kmExtras = Math.max(0, km - 10);
  const total = tarifa.base + (kmExtras * tarifa.adicionalKm);

  this.cotizadorService.setTarifaTotal(total);
  this.cotizadorService.setDistanciaKm(km);
  return total; // ✅ Esto soluciona el error
  
}


}
