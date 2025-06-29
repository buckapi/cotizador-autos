// Versión adaptada del componente ONE para usar Google Places Autocomplete

import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { TravelDataService } from '../../services/travel-data.service';
import { MapboxService } from '../../services/mapbox.service';
import { VirtualRouterService } from '../../services/virtual-router.service';
import { CotizadorService } from '../../services/cotizador.service';
import { TramosService } from '../../services/tramos.service';

@Component({
  selector: 'app-one',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './one.component.html',
  styleUrls: ['./one.component.css']
})
export class OneComponent implements OnInit, AfterViewInit {
  @ViewChild('originInput', { static: false }) originInput!: ElementRef;
  @ViewChild('destinationInput', { static: false }) destinationInput!: ElementRef;
  
  // Service type selection
  tipoServicio: 'aeropuerto' | 'punto' | 'hora' | null = null;
  vehiculoSeleccionado: string = 'sedan';

  // Form fields
  origin = '';
  destination = '';
  passengerCount = 1;
  maletaCount = 0;
  fechaIda = '';
  horaIda = '';
  fechaVuelta = '';
  horaVuelta = '';
  numeroVuelo = '';
  tipoViaje: 'solo_ida' | 'ida_vuelta' = 'solo_ida';
  horasContratadas = 2;

  // Other properties
  originSuggestions: string[] = [];
  destinationSuggestions: string[] = [];
  excesoLimite = false;
  duracionHoras = 2;
  tiempoRestanteSegundos = 0;
  tiempoValidezMinutos = 5;

  // Constants
  readonly MAX_PERSONAS = 16;
  readonly MAX_MALETAS = 18;
  readonly coordenadasAeropuertoCuliacan: [number, number] = [-107.4702, 24.7645];
  readonly nombreAeropuerto = 'Aeropuerto de Culiacán';

  // Timer
  private temporizadorInterval: any;

  originCoords: [number, number] | undefined;
  destinationCoords: [number, number] | undefined;

  constructor(
    private travelData: TravelDataService,
    private mapboxService: MapboxService,
    public virtualRouterService: VirtualRouterService,
    public cotizadorService: CotizadorService,
    public tramosService: TramosService
  ) {}

  ngOnInit(): void {
    this.tramosService.cargarTramos();
    this.recuperarDatosGuardados();
  }
  
  setOrigenDesdeAeropuerto(): void {
    this.origin = this.nombreAeropuerto;
    // You might want to set the coordinates as well
    // this.originCoords = this.coordenadasAeropuertoCuliacan;
  }
  
  recuperarDatosGuardados(): void {
    // Try to recover any previously saved form data from localStorage
    const savedData = localStorage.getItem('cotizacionData');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        Object.assign(this, data);
      } catch (e) {
        console.error('Error al recuperar datos guardados:', e);
      }
    }
  }
  
  guardarDatos(): void {
    // Save current form data to localStorage
    const formData = {
      tipoServicio: this.tipoServicio,
      vehiculoSeleccionado: this.vehiculoSeleccionado,
      origin: this.origin,
      destination: this.destination,
      passengerCount: this.passengerCount,
      maletaCount: this.maletaCount,
      fechaIda: this.fechaIda,
      horaIda: this.horaIda,
      fechaVuelta: this.fechaVuelta,
      horaVuelta: this.horaVuelta,
      numeroVuelo: this.numeroVuelo,
      tipoViaje: this.tipoViaje,
      horasContratadas: this.horasContratadas
    };
    localStorage.setItem('cotizacionData', JSON.stringify(formData));
  }

  seleccionarTipoServicio(tipo: 'aeropuerto' | 'punto' | 'hora') {
    this.tipoServicio = tipo;
    if (tipo === 'aeropuerto') {
      this.setOrigenDesdeAeropuerto();
    }
    // Reset form when changing service type
    this.destination = '';
    this.origin = '';
  }

  seleccionarVehiculo(tipo: string) {
    this.vehiculoSeleccionado = tipo;
  }

  vehiculoDisponible(tipo: string): boolean {
    return this.vehiculoSeleccionado === tipo;
  }
  private getVehiculoRecomendado(): string {
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
  
    return 'Van 16 asientos'; // fallback
  }
  
  ngAfterViewInit(): void {
    console.log('ngAfterViewInit - Verificando elementos...');
    
    // Verificar si los elementos están en el DOM
    const checkElements = () => {
      console.log('Buscando elementos en el DOM...');
      
      // Verificar si los elementos están en el DOM
      const originEl = document.querySelector('#originInput');
      const destEl = document.querySelector('#destinationInput');
      
      console.log('Elemento origin en DOM:', originEl);
      console.log('Elemento destination en DOM:', destEl);
      console.log('Referencia originInput:', this.originInput);
      console.log('Referencia destinationInput:', this.destinationInput);
      
      if (originEl && destEl) {
        this.initializeAutocomplete();
      } else {
        console.log('Elementos no encontrados, reintentando...');
        setTimeout(checkElements, 500);
      }
    };
  
    // Iniciar la verificación
    checkElements();
  }
  
  private initializeAutocomplete(): void {
    console.log('Inicializando autocompletado...');
    
    if (!this.originInput?.nativeElement || !this.destinationInput?.nativeElement) {
      console.error('No se pudieron obtener las referencias a los elementos de entrada');
      return;
    }
  
    try {
      // Inicializar autocompletado para origen
      const originAutocomplete = new google.maps.places.Autocomplete(
        this.originInput.nativeElement,
        { types: ['address'] }
      );
  
      originAutocomplete.addListener('place_changed', () => {
        const place = originAutocomplete.getPlace();
        if (!place.geometry?.location) {
          console.error('No se pudo obtener la ubicación del lugar de origen');
          return;
        }
        
        this.origin = place.formatted_address || '';
        this.originCoords = [
          place.geometry.location.lng(),
          place.geometry.location.lat()
        ];
      });
  
      // Inicializar autocompletado para destino
      const destinationAutocomplete = new google.maps.places.Autocomplete(
        this.destinationInput.nativeElement,
        { types: ['address'] }
      );
  
      destinationAutocomplete.addListener('place_changed', () => {
        const place = destinationAutocomplete.getPlace();
        if (!place.geometry?.location) {
          console.error('No se pudo obtener la ubicación del lugar de destino');
          return;
        }
        
        this.destination = place.formatted_address || '';
        this.destinationCoords = [
          place.geometry.location.lng(),
          place.geometry.location.lat()
        ];
      });
  
      console.log('Autocompletado inicializado correctamente');
    } catch (error) {
      console.error('Error al inicializar el autocompletado:', error);
    }
  }
  
  increaseCount(): void {
    if (this.passengerCount < this.MAX_PERSONAS) {
      this.passengerCount++;
      this.verificarLimites();
    }
  }
  
  decreaseCount(): void {
    if (this.passengerCount > 1) {
      this.passengerCount--;
      this.verificarLimites();
    }
  }
  
  increaseMaletaCount(): void {
    if (this.maletaCount < this.MAX_MALETAS) {
      this.maletaCount++;
      this.verificarLimites();
    }
  }
  
  decreaseMaletaCount(): void {
    if (this.maletaCount > 0) {
      this.maletaCount--;
      this.verificarLimites();
    }
  }
  
  private verificarLimites(): void {
    this.excesoLimite = this.passengerCount > this.MAX_PERSONAS || this.maletaCount > this.MAX_MALETAS;
    if (this.excesoLimite) {
      this.mostrarAlerta(this.passengerCount > this.MAX_PERSONAS ? 'pasajeros' : 'maletas');
    }
  }
  
  private mostrarAlerta(tipo: 'pasajeros' | 'maletas'): void {
    const maximo = tipo === 'pasajeros' ? this.MAX_PERSONAS : this.MAX_MALETAS;
    Swal.fire({
      icon: 'warning',
      title: `Límite de ${tipo} excedido`,
      text: `El número máximo de ${tipo} permitido es ${maximo}.`,
      confirmButtonText: 'Entendido'
    });
  }
  async onSubmit() {
    try {
      // Validate required fields
      if (!this.origin) {
        await Swal.fire('Error', 'Por favor ingresa un origen válido', 'error');
        return;
      }

      if (this.tipoServicio !== 'hora' && !this.destination) {
        await Swal.fire('Error', 'Por favor ingresa un destino válido', 'error');
        return;
      }

      if (this.tipoServicio === 'aeropuerto' && !this.numeroVuelo) {
        await Swal.fire('Error', 'Por favor ingresa el número de vuelo', 'error');
        return;
      }

      // Show loading state
      Swal.fire({
        title: 'Procesando tu solicitud',
        text: 'Estamos calculando la mejor ruta para ti...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Get coordinates if not already set
      if (!this.originCoords && this.origin) {
        this.originCoords = await this.getCoordinates(this.origin);
      }
      
      if (this.tipoServicio !== 'hora' && !this.destinationCoords && this.destination) {
        this.destinationCoords = await this.getCoordinates(this.destination);
      }

      // Calculate distance for non-hourly services
      let distanceKm = 0;
      if (this.tipoServicio !== 'hora' && this.originCoords && this.destinationCoords) {
        distanceKm = await this.mapboxService.getDistanceFromMapbox(
          this.originCoords,
          this.destinationCoords
        );
      }

      // Prepare travel data
      const travelData = {
        tipoServicio: this.tipoServicio,
        vehiculo: this.vehiculoSeleccionado,
        origin: this.origin,
        destination: this.destination,
        originCoords: this.originCoords,
        destinationCoords: this.destinationCoords,
        passengerCount: this.passengerCount,
        maletaCount: this.maletaCount,
        fechaIda: this.fechaIda,
        horaIda: this.horaIda,
        fechaVuelta: this.fechaVuelta,
        horaVuelta: this.horaVuelta,
        numeroVuelo: this.numeroVuelo,
        tipoViaje: this.tipoViaje,
        horasContratadas: this.horasContratadas,
        distanciaKm: distanceKm,
        timestamp: new Date().getTime()
      };

      // Save data to services and storage
      this.travelData.setTravelData(this.origin, this.destination);
      this.cotizadorService.setDistanciaKm(distanceKm);
      localStorage.setItem('datosCotizador', JSON.stringify(travelData));
      this.guardarDatos();

      // Navigate to next step
      this.virtualRouterService.setActiveRoute('two');
      
      // Close loading dialog
      Swal.close();
      
    } catch (error) {
      console.error('Error al procesar el formulario:', error);
      await Swal.fire(
        'Error',
        'Ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo.',
        'error'
      );
    }
  }

  private async getCoordinates(address: string): Promise<[number, number]> {
    try {
      const response = await this.mapboxService.geocodeAddress(address);
      if (response && response.features && response.features.length > 0) {
        const [lng, lat] = response.features[0].center;
        return [lng, lat];
      }
      throw new Error('No se pudieron obtener las coordenadas');
    } catch (error) {
      console.error('Error al obtener coordenadas:', error);
      throw error;
    }
  }
}
