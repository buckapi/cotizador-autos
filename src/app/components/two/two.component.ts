import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CotizadorService } from '../../services/cotizador.service';
import { TramosService } from '../../services/tramos.service';

@Component({
  selector: 'app-two',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './two.component.html',
  styleUrls: ['./two.component.css']
})
export class TwoComponent implements OnInit {
  tipoServicio: 'hora' | 'punto' | 'aeropuerto' = 'punto'; // default

tarifaAeropuerto = 8000; // o el valor que definas como fijo
distanciaKm = 0;
tiempoMaximo = 24;
tarifaTotal = 0;
duracionHoras = 2;
constructor(
  public cotizadorService: CotizadorService,
  private tramosService: TramosService
){}
obtenerClaveVehiculo(tipo: string, subtipo: string): string {
  const normalizar = (txt: string) => txt.toLowerCase().replace(/\s+/g, '_');

  if (tipo === 'minibus' && subtipo === 'Van 12 asientos') return 'minibus_12';
  if (tipo === 'Van 16 asientos') return 'minibus_19';

  return `${normalizar(tipo)}_${normalizar(subtipo)}`;
}


  vehiculoSeleccionado: string = 'sedan';

  tarifasHora = [
    { tipo: 'sedan', subtipo: 'estandar', pasajeros: 3, base: 1500, adicional: 750, tiempoMax: '24 h' },
    { tipo: 'sedan', subtipo: 'espacioso', pasajeros: 3, base: 2056, adicional: 1028, tiempoMax: '24 h' },
    { tipo: 'sedan', subtipo: 'premium', pasajeros: 3, base: 3480, adicional: 1740, tiempoMax: '24 h' },
    { tipo: 'minivan', subtipo: 'estandar', pasajeros: 6, base: 2898, adicional: 1449, tiempoMax: '24 h' },
    { tipo: 'minivan', subtipo: 'premium', pasajeros: 6, base: 5761, adicional: 2880, tiempoMax: '24 h' },
    { tipo: 'suv', subtipo: 'premium', pasajeros: 7, base: 6356, adicional: 3178, tiempoMax: '24 h' },
    { tipo: 'minibus', subtipo: 'Van 12 asientos', pasajeros: 12, base: 7950, adicional: 3975, tiempoMax: '24 h' },
    { tipo: 'Van 16 asientos', subtipo: 'Van 16 asientos', pasajeros: 16, base: 8960, adicional: 4480, tiempoMax: '24 h' }
  ];
  
  

  calcularTarifaPorHora(horas: number): number {
    const tarifa = this.tarifasHora.find(t =>
      t.tipo === this.vehiculoSeleccionado &&
      t.subtipo === this.vehiculoSubtipoSeleccionado
    );
  
    if (!tarifa) return 0;
  
    const horasExtras = Math.max(0, horas - 2); // Las primeras 2 horas ya están incluidas
    return tarifa.base + horasExtras * tarifa.adicional;
  }
  
  getTarifaDetalle() {
    const claveVehiculo = this.obtenerClaveVehiculo(this.vehiculoSeleccionado, this.vehiculoSubtipoSeleccionado);
    const servicioSeleccionado = this.tipoServicio === 'aeropuerto' ? 'aeropuerto_hotel' : 'punto_a_punto';
    const detalle: any = { distancia: {}, hora: {} };
  
    if (!this.tramosService || !this.tramosService['tramos']) return detalle;
  
    for (const tramo of this.tramosService['tramos']) {
      if (tramo.tipo === 'fijo') {
        const tarifasServicio = tramo.tarifas as Record<string, Record<string, number>>;
        const precioBase = tarifasServicio?.[servicioSeleccionado]?.[claveVehiculo];
        if (precioBase !== undefined) {
          detalle.distancia.base = precioBase;
        }
      }
  
      if (tramo.tipo === 'por_intervalo') {
        const precioPorKm = (tramo.tarifas as Record<string, number>)[claveVehiculo];
        if (precioPorKm !== undefined) {
          detalle.distancia.adicional = precioPorKm;
        }
      }
    }
  
    // Detalle por hora según tabla de tarifasHora
    if (this.tipoServicio === 'hora') {
      const tarifaHora = this.tarifasHora.find(t =>
        t.tipo === this.vehiculoSeleccionado &&
        t.subtipo === this.vehiculoSubtipoSeleccionado
      );
      if (tarifaHora) {
        detalle.hora = {
          pasajeros: tarifaHora.pasajeros,
          base: tarifaHora.base,
          adicional: tarifaHora.adicional,
          tiempoMax: tarifaHora.tiempoMax
        };
      }
    }
  
    return detalle;
  }
  
    
  
  vehiculoSubtipoSeleccionado: 'estandar' | 'espacioso' | 'premium' | 'Van 12 asientos' | 'Van 16 asientos' = 'estandar';

  imagenesVehiculos = [
    { tipo: 'sedan', subtipo: 'estandar', img: 'assets/img/vehiculos/sedan_standar.png' },
    { tipo: 'sedan', subtipo: 'espacioso', img: 'assets/img/vehiculos/sedan_espacioso.png' },
    { tipo: 'sedan', subtipo: 'premium', img: 'assets/img/vehiculos/sedan_premium.png' },
    { tipo: 'minivan', subtipo: 'estandar', img: 'assets/img/vehiculos/minivan_standar.png' },
    { tipo: 'minivan', subtipo: 'premium', img: 'assets/img/vehiculos/minivan_premium.png' },
    { tipo: 'suv', subtipo: 'premium', img: 'assets/img/vehiculos/suv_premium.png' },
    { tipo: 'minibus', subtipo: 'Van 12 asientos', img: 'assets/img/vehiculos/bus12_standar.png' },
    { tipo: 'Van 16 asientos', subtipo: 'Van 16 asientos', img: 'assets/img/vehiculos/bus16_standar.png' }
  ];
  actualizarTarifaTotal() {
    const tipoServicio = this.tipoServicio === 'aeropuerto' ? 'aeropuerto_hotel' : 'punto_a_punto';
    const claveVehiculo = this.obtenerClaveVehiculo(this.vehiculoSeleccionado, this.vehiculoSubtipoSeleccionado);
  
    this.tarifaTotal = this.tramosService.calcularTarifa(this.distanciaKm, tipoServicio, claveVehiculo);
  }
  
  
  
  async ngOnInit(): Promise<void> {
    await this.tramosService.cargarTramos();
  
    this.duracionHoras = this.cotizadorService.getDuracionHoras();
    const dataRaw = localStorage.getItem('datosCotizador');
    if (dataRaw) {
      const data = JSON.parse(dataRaw);
      this.vehiculoSeleccionado = data.vehiculoSeleccionado || 'sedan';
      this.vehiculoSubtipoSeleccionado = data.vehiculoSubtipoSeleccionado || 'estandar';
      this.tipoServicio = data.tipoServicio || 'punto';
      this.distanciaKm = this.cotizadorService.getDistanciaKm();
      this.actualizarTarifaTotal();
    }
  }
  
  
  

  get subtiposDisponibles(): Array<'estandar' | 'espacioso' | 'premium' | 'Van 12 asientos' | 'Van 16 asientos'> {
    return this.imagenesVehiculos
      .filter(v => v.tipo === this.vehiculoSeleccionado)
      .map(v => v.subtipo as any);
  }
  seleccionarSubtipo(subtipo: 'estandar' | 'espacioso' | 'premium' | 'Van 12 asientos' | 'Van 16 asientos') {
    this.vehiculoSubtipoSeleccionado = subtipo;
    this.actualizarTarifaTotal();
  }
  

  getImagenVehiculo(): string {
    const imagen = this.imagenesVehiculos.find(
      v => v.tipo === this.vehiculoSeleccionado && v.subtipo === this.vehiculoSubtipoSeleccionado
    );
    return imagen?.img ?? 'assets/img/vehiculos/default.png';
  }
}
