//JavaScript-Code, um die Map-Darstellung und damit verknüpfte Funktionen zu ermöglichen

//nötige Imports
import {DefaultIcon, LayerGroup, LeafletMap, Marker, TileLayer} from 'leaflet';
  
  //Fragt ab, ob der Nutzer angemeldet ist:
  //alert(Auth.isLoggedIn());

  if (Auth.isLoggedIn()) {
    console.log("User ist eingeloggt, Favoriten können gespeichert werden.");
    // Hier deinen Karten-Code ausführen
  } else {
    console.log("Nicht eingeloggt! Speicher von Favoriten nicht möglich.");
    //window.location.href = 'login.html';
  }

  //Initialisiert die Map
    //const map = new LeafletMap('map').setView([51.1657, 10.4515], 7); //Deutschland
    const map = new LeafletMap('map').setView([53.6288, 11.4148], 8); //Schwerin
    new TileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map); 
      
    //Kartenebenen
    const cityLayer = new LayerGroup().addTo(map);
    const stationsLayer = new LayerGroup();
      
    //Favoritenspeicher
    const favoritesMap = new Map();
    const stationMarkersMap = new Map();

    //Icons
    const defaultIcon = new DefaultIcon(); //normal
    const favoriteIcon = new DefaultIcon({color: 'crimson'}); //Favoriten

    //Zwischenspeicher für bereits abgefragte Daten (dieselben Informationen werden so nicht mehrfach abgerufen)
    const loadedCities = new Set();
    let citiesData = [];

    //Favoritenliste
    function renderSidebar() { 
      const listEl = document.getElementById('favoritesList'); 
      if (!listEl) return; 
      listEl.innerHTML = ''; 
      // Hinweis anzeigen, wenn keine Favoriten vorhanden sind 
      if (favoritesMap.size === 0) { 
        listEl.innerHTML = '<li>Noch keine Favoriten gespeichert.</li>'; return; 
      } 
      favoritesMap.forEach((station, stationId) => { 
        const li = document.createElement('li'); 
        li.className = 'fav-item'; 
        li.innerHTML = ` <b>${station.operator || 'Ladesäule'}, ID:${station.station_id || 'Unknown'}</b><br /> ${station.charging_type || ''}, ${station.post_code || ''} `; 
        // Interaktion: Klick auf Listenelement zentriert die Karte auf die Säule & öffnet das Popup 
        li.addEventListener('click', () =>{ if (station.lat && station.lon) { 
          map.setView([station.lat, station.lon], 16); 
          const marker = stationMarkersMap.get(stationId); 
          if (marker) { marker.openPopup(); } 
          } 
        }); 
        listEl.appendChild(li); 
      }); 
    }

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
            const isFav = favoritesMap.has(stationId); //Fragt ab ob die Säule Favorit ist
              
            //Ladesäulenmarker
            const stationMarker = new Marker([station.lat, station.lon], { icon: isFav ? favoriteIcon : defaultIcon }); //blau oder rot abhängig vom Favoritenstatus

            stationMarkersMap.set(stationId, stationMarker);

            stationMarker.bindPopup(`<b>${station.operator || 'Ladesäule'}, ID:${station.station_id || 'Unknown'}</b><br />${station.charging_type || ''}`); 

            stationMarker.on('pointerover', function () { this.openPopup(); });  
            stationMarker.on('pointerout', function () { this.closePopup(); });
                
            stationMarker.on('click', () => { 
              if (favoritesMap.has(stationId)) { //war schon Favorit -> nicht mehr Favorit
                favoritesMap.delete(stationId); 
                stationMarker.setIcon(defaultIcon); 
                console.log(`Aus Favoriten entfernt: ${stationId}`);
              } else { // war kein Favorit -> Favorit
                favoritesMap.set(stationId, station); 
                stationMarker.setIcon(favoriteIcon); 
                console.log(`Als Favorit gespeichert: ${stationId}`); 
              }

              renderSidebar();
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