import { Injectable } from '@angular/core';
import * as mapboxgl from 'mapbox-gl';

@Injectable({ providedIn: 'root' })
export class MapboxService {
  map!: mapboxgl.Map;

  directionsApi = 'https://api.mapbox.com/directions/v5/mapbox/driving';

  initMap(container: HTMLElement, token: string, center: [number, number]) {
    this.map = new mapboxgl.Map({
      container: container,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: center,
      zoom: 10,
      accessToken: token // ✅ <-- aquí se pone el token ahora
    });

    this.map.addControl(new mapboxgl.NavigationControl());
  }
  searchPlaces(query: string, token: string): Promise<any[]> {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?autocomplete=true&limit=3&access_token=${token}`;
    return fetch(url)
      .then(res => res.json())
      .then(data => data.features || []);
  }
  
  async drawRoute(origin: [number, number], destination: [number, number], token: string) {
    const url = `${this.directionsApi}/${origin.join(',')};${destination.join(',')}?geometries=geojson&access_token=${token}`;
    const res = await fetch(url);
    const data = await res.json();
    const route = data.routes[0].geometry;

    if (this.map.getSource('route')) {
      (this.map.getSource('route') as mapboxgl.GeoJSONSource).setData({
        type: 'Feature',
        geometry: route,
        properties: {}
      });
    } else {
      this.map.addLayer({
        id: 'route',
        type: 'line',
        source: {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: route,
            properties: {}
          }
        },
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3b9ddd',
          'line-width': 5
        }
      });
    }

    const bounds = new mapboxgl.LngLatBounds();
    route.coordinates.forEach((coord: [number, number]) => bounds.extend(coord));
    this.map.fitBounds(bounds, { padding: 50 });
  }
}
