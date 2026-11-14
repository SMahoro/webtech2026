//JavaScript-Code, um die Map-Darstellung und damit verknüpfte Funktionen zu ermöglichen

//nötige Imports
import {DefaultIcon, LayerGroup, LeafletMap, Marker, TileLayer} from 'leaflet';
      
  //Initialisiert die Map
    //const map = new LeafletMap('map').setView([51.1657, 10.4515], 7); //Deutschland
    const map = new LeafletMap('map').setView([53.6288, 11.4148], 8); //Schwerin
    new TileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map); 
      
    //Kartenebenen
    const cityLayer = new LayerGroup().addTo(map);
    const stationsLayer = new LayerGroup();
      
    //Favoritenspeicher
    const favoritesSet = new Set();

    //Icons
    const defaultIcon = new DefaultIcon(); //normal
    const favoriteIcon = new DefaultIcon({color: 'crimson'}); //Favoriten

    //Zwischenspeicher für bereits abgefragte Daten (dieselben Informationen werden so nicht mehrfach abgerufen)
    const loadedCities = new Set();
    let citiesData = [];
    
  //Städtemarker anzeigen(Zoomstufe 6-10)
    async function loadCityMarkers() { 
      console.log("loadCityMarkers() called")
      try { 
        const responseCities = await fetch('https://infranode.dev/api/v1/cities'); 
        const responseDataCities = await responseCities.json(); 
        citiesData = responseDataCities.data;  
        console.log(citiesData);            

        citiesData.forEach(city => {  
          if (city.geo) { 
            const cityMarker = new Marker([city.geo.lat, city.geo.lon]); 
            cityMarker.bindPopup(`<b>${city.name_de}</b><br />Klicke zum Heranzoomen`);

            cityMarker.on('pointerover', function () { this.openPopup(); });
            cityMarker.on('pointerout', function () { this.closePopup(); });

            cityMarker.on('click', () => { 
              map.setView([city.geo.lat, city.geo.lon], 12); 
            });
              
            cityLayer.addLayer(cityMarker); 
          } 
        }); 
      } catch (error) {
        console.error('Fehler beim Laden der Städte-Marker:', error); 
      }
    } 
      
    //Ladesäulenmarker (Zoomstufe > 10)
    async function loadCityStations(citySlug) { 
      console.log("loadCityStations called", citySlug, loadedCities);
      if (loadedCities.has(citySlug)) return;
      
      loadedCities.add(citySlug);

      try { 
        const responseCharging = await fetch(`https://infranode.dev/api/v1/cities/${citySlug}/charging`);
        const responseDataCharging = await responseCharging.json(); 
        const chargingStations = responseDataCharging.data.payload.stations; 

        console.log("stations try loop entered", chargingStations.station_id, chargingStations);
          
        chargingStations.forEach(station => { 
          if (station.lat || station.lon) { 
            const stationId = station.station_id;
            const isFav = favoritesSet.has(stationId); //Fragt ab ob die Säule Favorit ist
              
            //Ladesäulenmarker
            const stationMarker = new Marker([station.lat, station.lon], { icon: isFav ? favoriteIcon : defaultIcon }); //blau oder rot abhängig vom Favoritenstatus

            stationMarker.bindPopup(`<b>${station.operator || 'Ladesäule'}, ID:${station.station_id || 'Unknown'}</b><br />${station.charging_type || ''}`); 

            stationMarker.on('pointerover', function () { this.openPopup(); });  
            stationMarker.on('pointerout', function () { this.closePopup(); });
                
            stationMarker.on('click', () => { 
              if (favoritesSet.has(stationId)) { //war schon Favorit -> nicht mehr Favorit
                favoritesSet.delete(stationId); 
                stationMarker.setIcon(defaultIcon); 
                console.log(`Aus Favoriten entfernt: ${stationId}`);
              } else { // war kein Favorit -> Favorit
                favoritesSet.add(stationId); 
                stationMarker.setIcon(favoriteIcon); 
                console.log(`Als Favorit gespeichert: ${stationId}`); 
              }
            });

            stationsLayer.addLayer(stationMarker); 
          }
        });
      } catch (err) { 
        console.error(`Fehler beim Laden der Säulen für ${citySlug}:`, err); 
      } 
    }

    //delay für weniger heftige API-Calls
    function debounce(func, delay) { 
      let timeoutId; 
      return function (...args) { 
        clearTimeout(timeoutId); 
        timeoutId = setTimeout(() => func.apply(this, args), delay); 
      }; 
    }

    map.on('moveend', debounce(() => {  //Nachladen der Ladesäulemarker anderer Städte, wenn sie in Sicht kommen
      const currentZoom = map.getZoom(); 
      const bounds = map.getBounds(); 
        
      if (currentZoom <= 10) { 
        if (!map.hasLayer(cityLayer)) map.addLayer(cityLayer); 
        if (map.hasLayer(stationsLayer)) map.removeLayer(stationsLayer); 
      } else { 
        if (map.hasLayer(cityLayer)) map.removeLayer(cityLayer); 
        if (!map.hasLayer(stationsLayer)) map.addLayer(stationsLayer);
          
        citiesData.forEach(city => { 
          if (city?.geo?.lat && city?.geo?.lon) { 
            if (bounds.contains([city.geo.lat, city.geo.lon])) { loadCityStations(city.slug); } 
          } 
        }); 
      } 
    }, 300));

    loadCityMarkers();