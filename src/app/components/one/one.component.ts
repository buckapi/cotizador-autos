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
import { TramosService } from '../../services/tramos.service';

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
    vehiculoSubtipoSeleccionado: 'estandar' | 'espacioso' | 'premium' | 'Van 12 asientos' | 'Van 16 asientos' = 'estandar';

    readonly MAX_PERSONAS = 16;
    readonly MAX_MALETAS = 18;
    readonly coordenadasAeropuertoCuliacan: [number, number] = [-107.4702, 24.7645];
  readonly nombreAeropuerto = 'Aeropuerto de Culiacán';

    excesoLimite = false; // Para mostrar u ocultar el aviso

    tipoServicio: 'aeropuerto' | 'punto' | 'hora' | undefined;
    vehiculoSeleccionado: string = 'sedan';

    
    
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
      public cotizadorService: CotizadorService,
      public tramosService: TramosService
    ) {}

    ngOnInit() {

      this.tramosService.cargarTramos();
      this.recuperarDatosGuardados();
    }
    increaseMaletaCount() {
      if (this.maletaCount < this.MAX_MALETAS) {
        this.maletaCount++;
        this.actualizarVehiculoPorCantidad();
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
        this.actualizarVehiculoPorCantidad();
        if (this.passengerCount === this.MAX_PERSONAS) {
          this.mostrarAlerta('pasajeros');
        }
      }
    }
    
    
    decreaseCount() {
      if (this.passengerCount > 1) {
        this.passengerCount--;
        this.actualizarVehiculoPorCantidad();
      }
      this.verificarLimites();
    }
    
    
    decreaseMaletaCount() {
      if (this.maletaCount > 0) {
        this.maletaCount--;
        this.actualizarVehiculoPorCantidad();
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
    async geocodeAddress(address: string): Promise<[number, number]> {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${this.token}`
      );
      const data = await response.json();
    
      if (!data.features || data.features.length === 0) {
        throw new Error(`No se encontró coordenada para la dirección: ${address}`);
      }
    
      return data.features[0].center; // [lng, lat]
    }
    
    async getRouteDistanceKm(
      origin: [number, number],
      destination: [number, number],
      token: string
    ): Promise<number> {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.join(',')};${destination.join(',')}?access_token=${token}`
      );
      const data = await response.json();
      const distanceMeters = data.routes[0].distance;
      return distanceMeters / 1000; // Convertir a km
    }
    
    async getDistanceFromMapbox(): Promise<number> {
      try {
        const originCoord = await this.geocodeAddress(this.origin);
        const destinationCoord = await this.geocodeAddress(this.destination);
        const distanceKm = await this.getRouteDistanceKm(originCoord, destinationCoord, this.token);
    
        this.cotizadorService.setDistanciaKm(distanceKm);
        return distanceKm;
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error en dirección',
          text: (error as Error).message || 'No se pudo calcular la distancia. Verifique las direcciones ingresadas.',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#d6c500'
        });
        return 0;
      }
    }
    
    
    async onSubmit() {
      const distanciaReal = await this.getDistanceFromMapbox(); // ✅ usa Mapbox directamente

      const data: any = {
        tipoServicio: this.tipoServicio,
        origin: this.origin,
        destination: this.destination,
        passengerCount: this.passengerCount,
        maletaCount: this.maletaCount,
        timestamp: new Date().getTime()
      };
    
      // Asignación automática del subtipo
      this.vehiculoSeleccionado = this.getVehiculoRecomendado();
      this.vehiculoSubtipoSeleccionado = this.asignarSubtipo(this.vehiculoSeleccionado);
    
      let tarifaTotal = 0;
    
      if (this.tipoServicio === 'aeropuerto') {
        data.fechaIda = this.fechaIda;
        data.horaIda = this.horaIda;
        data.fechaVuelta = this.fechaVuelta;
        data.horaVuelta = this.horaVuelta;
        data.numeroVuelo = this.numeroVuelo;
        data.tipoViaje = this.tipoViaje;
    
        tarifaTotal = this.calcularTarifaDistancia(distanciaReal); // ✅ aquí
      }
    
      if (this.tipoServicio === 'punto') {
        tarifaTotal = this.calcularTarifaDistancia(distanciaReal); // ✅ aquí también
      }
    
      if (this.tipoServicio === 'hora') {
        data.horasContratadas = this.horasContratadas;
        tarifaTotal = this.calcularTarifaHora();
      }
    
      data.tarifaTotal = tarifaTotal;
      data.vehiculoSeleccionado = this.vehiculoSeleccionado;
      data.vehiculoSubtipoSeleccionado = this.vehiculoSubtipoSeleccionado;
    
      Swal.fire({
        icon: 'info',
        title: 'Tarifa estimada',
        html: `El costo aproximado es <strong>$${tarifaTotal.toLocaleString('es-MX')}</strong>`,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#d6c500'
      });
    
      this.travelData.setTravelData(data.origin, data.destination);
      localStorage.setItem('datosCotizador', JSON.stringify(data));
      this.iniciarTemporizador();
      this.cotizadorService.setDistanciaKm(distanciaReal);
      this.cotizadorService.setDuracionHoras(this.horasContratadas);
      this.virtualRouterService.setActiveRoute('two');

    }
    
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
        { tipo: 'Van 16 asientos', maxPersonas: 16, maxMaletas: 16 }
      ];
    
      for (let v of capacidades) {
        if (personas <= v.maxPersonas && maletas <= v.maxMaletas) {
          return v.tipo;
        }
      }
    
      return 'Van 16 asientos'; // fallback si todo falla
    }
    
    
    selectVehicle(vehicle: string) {
    
      this.horasContratadas = 2;
    }
    // Tarifas por hora
  tarifasHora = [
    { tipo: 'sedan', subtipo: 'estandar', base: 1500, adicional: 750 },
    { tipo: 'sedan', subtipo: 'espacioso', base: 2056, adicional: 1028 },
    { tipo: 'sedan', subtipo: 'premium', base: 3480, adicional: 1740 },
    { tipo: 'minivan', subtipo: 'estandar', base: 2898, adicional: 1449 },
    { tipo: 'minivan', subtipo: 'premium', base: 5761, adicional: 2880 },
    { tipo: 'suv', subtipo: 'premium', base: 6356, adicional: 3178 },
    { tipo: 'Van 12 asientos', subtipo: 'Van 12 asientos', base: 7950, adicional: 3975 },
    { tipo: 'Van 16 asientos', subtipo: 'Van 16 asientos', base: 8960, adicional: 4480 }
  ];
  // Tarifas por distancia 

  tarifasDistancia: any[] = [];
  /*
  //   // { tipo: 'sedan', subtipo: 'estandar', base: 650, adicional: 22 },
  //   // { tipo: 'sedan', subtipo: 'espacioso', base: 890, adicional: 26 },
  //   // { tipo: 'sedan', subtipo: 'premium', base: 1340, adicional: 32 },
  //   // { tipo: 'minivan', subtipo: 'estandar', base: 1100, adicional: 34 },
  //   // { tipo: 'minivan', subtipo: 'premium', base: 1750, adicional: 42 },880 },
  //   // { tipo: 'suv', subtipo: 'premium', base: 2100, adicional: 49 },
  //   // { tipo: 'minibus', subtipo: 'Van 12 asientos', base: 3500, adicional: 64 },
  //   // { tipo: 'Van 16 asientos', subtipo: 'Van 16 asientos', base: 5100, adicional: 79 }4480 }
  */
  obtenerClaveVehiculo(tipo: string, subtipo: string): string {
    const normalizar = (txt: string) => txt.toLowerCase().replace(/\s+/g, '_');
  
    if (tipo === 'minibus' && subtipo === 'Van 12 asientos') return 'minibus_12';
    if (tipo === 'Van 16 asientos') return 'minibus_19';
  
    return `${normalizar(tipo)}_${normalizar(subtipo)}`;
  }
  
  calcularTarifaDistancia(km: number): number {
    if (!this.tipoServicio) return 0;
  
    const servicio = this.tipoServicio === 'aeropuerto' ? 'aeropuerto_hotel' : 'punto_a_punto';
  
    const claveVehiculo = this.obtenerClaveVehiculo(this.vehiculoSeleccionado, this.vehiculoSubtipoSeleccionado);
  
    const total = this.tramosService.calcularTarifa(km, servicio, claveVehiculo);
  
    this.cotizadorService.setTarifaTotal(total);
    this.cotizadorService.setDistanciaKm(km);
    return total;
  }
  
  
  calcularTarifaHora(): number {
    const tarifa = this.tarifasHora.find(t =>
      t.tipo === this.vehiculoSeleccionado &&
      t.subtipo === this.vehiculoSubtipoSeleccionado
    );
    if (!tarifa) return 0;

    const horasExtras = Math.max(0, this.horasContratadas - 2);
    return tarifa.base + (horasExtras * tarifa.adicional);
  }


  private asignarSubtipo(tipo: string): 'estandar' | 'espacioso' | 'premium' | 'Van 12 asientos' | 'Van 16 asientos' {
    switch (tipo) {
      case 'suv':
        return 'premium';
      case 'minibus':
        return 'Van 12 asientos';
      case 'Van 16 asientos':
        return 'Van 16 asientos';
      case 'sedan':
      case 'minivan':
        return this.vehiculoSubtipoSeleccionado; // Ya elegido por el usuario
      default:
        return 'estandar';
    }
  }
  actualizarVehiculoPorCantidad() {
    const nuevoTipo = this.getVehiculoRecomendado();
  
    if (nuevoTipo !== this.vehiculoSeleccionado) {
      this.vehiculoSeleccionado = nuevoTipo;
      this.vehiculoSubtipoSeleccionado = this.asignarSubtipo(nuevoTipo);
  
      // ⬇️ Guarda también en localStorage para que TWO lo vea
      const datosActuales = JSON.parse(localStorage.getItem('datosCotizador') || '{}');
  
      localStorage.setItem('datosCotizador', JSON.stringify({
        ...datosActuales,
        vehiculoSeleccionado: this.vehiculoSeleccionado,
        vehiculoSubtipoSeleccionado: this.vehiculoSubtipoSeleccionado
      }));
  
      const Toast = Swal.mixin({
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        background: '#333',
        color: 'yellow',
        timer: 2500,
        timerProgressBar: true,
        customClass: {
          popup: 'vehiculo-toast'
        }
      });
  
      Toast.fire({
        icon: 'warning',
        title: `Vehículo recomendado: ${nuevoTipo.toUpperCase()}`
      });
    }
  }
  
  
  

  }
