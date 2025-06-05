import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TravelDataService } from '../../services/travel-data.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MapboxService } from '../../services/mapbox.service';

@Component({
  selector: 'app-one',
  imports: [FormsModule,CommonModule],
  templateUrl: './one.component.html',
  styleUrls: ['./one.component.css']
})
export class OneComponent {
  origin = '';
  destination = '';
  originSuggestions: string[] = [];
  destinationSuggestions: string[] = [];
  private readonly token = 'pk.eyJ1IjoiY29uZWN0YXZldC1jb20iLCJhIjoiY20ybDZpc2dmMDhpMDJpb21iZGI1Y2ZoaCJ9.WquhO_FA_2FM0vhYBaZ_jg';
  constructor(private travelData: TravelDataService,
    private mapboxService: MapboxService
  ) {}
  async onOriginInput() {
    if (this.origin.length > 2) {
      const results = await this.mapboxService.searchPlaces(this.origin, this.token);
      this.originSuggestions = results.map(f => f.place_name);
    } else {
      this.originSuggestions = [];
    }
  }
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
    this.travelData.setTravelData(this.origin, this.destination);
  }
}

