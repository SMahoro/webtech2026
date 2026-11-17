//JavaScript-Code, um die Map-Darstellung und damit verknüpfte Funktionen zu ermöglichen

//nötige Imports
import {DefaultIcon, LayerGroup, LeafletMap, Marker, TileLayer} from 'leaflet';
  
  //Login-Abfrage
    //alert(Auth.isLoggedIn());

    if (Auth.isLoggedIn()) {
      console.log("User ist eingeloggt, Favoriten können gespeichert werden.");
    } else {
      console.log("Nicht eingeloggt! Speicher von Favoriten nicht möglich.");
    }

  //Map-Initialisierung
    //const map = new LeafletMap('map').setView([51.1657, 10.4515], 7); //Deutschland
    const map = new LeafletMap('map').setView([53.6288, 11.4148], 8); //Schwerin
    new TileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map); 
      
    const cityLayer = new LayerGroup().addTo(map);
    const stationsLayer = new LayerGroup();
  
    const defaultIcon = new DefaultIcon(); //normal
    const favoriteIcon = new DefaultIcon({color: 'crimson'}); //Favoriten
      
  //Arbeitsspeicher
    let citiesData = [];

    const loadedCities = new Set();

    function loadFavoritesFromSession() {
      const saved = sessionStorage.getItem('favoritesMap');
      return saved ? new Map(JSON.parse(saved)) : new Map();
    }

    function saveFavoritesToSession() {
      const mapAsArray = Array.from(favoritesMap.entries());
      sessionStorage.setItem('favoritesMap', JSON.stringify(mapAsArray));
    }

    const favoritesMap = loadFavoritesFromSession();
    const stationMarkersMap = new Map();

  //Städte laden
    async function getCitiesData() { 
      if (Array.isArray(citiesData) && citiesData.length > 0) { return citiesData; } 
      
      try {
        const cachedCities = sessionStorage.getItem('citiesData'); 
        if (cachedCities) { 
          const parsed = JSON.parse(cachedCities);
          if (Array.isArray(parsed)) {
            citiesData = parsed;
            console.log('Städte aus sessionStorage geladen'); 
            return citiesData;
          }
        }
      } catch (e) { 
        console.error('Fehler beim Lesen aus sessionStorage:', e); 
      }  
      
      try { 
        const response = await fetch('https://infranode.dev/api/v1/cities'); 

        if (!response.ok) {
          throw new Error(`HTTP-Fehler! Status: ${response.status}`);
        }

        const responseData = await response.json(); 
        citiesData = Array.isArray(responseData?.data) ? responseData.data : [];

        if (citiesData.length > 0) {
          try {
            sessionStorage.setItem('citiesData', JSON.stringify(citiesData));
            console.log('Städte frisch von der API geladen und im sessionStorage gespeichert'); 
          } catch (storageError) {
            console.warn('Konnte nicht im sessionStorage speichern:', storageError);
          }
        }
      } catch (error) { 
        console.error('Fehler beim Laden der Städte-Daten:', error); 
        citiesData = [];
      }
      return citiesData; 
    }

  //Städtemarker anzeigen(Zoomstufe 6-10)
    async function loadCityMarkers() { 
      console.log("loadCityMarkers() called")
      
      try { 
        const cities = await getCitiesData();

        cities.forEach(city => {  
          if (city.geo && city.geo.lat && city.geo.lon) { 
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

      if(Auth.isLoggedIn()){
        renderSidebar();
      }
    }   

  //Ladesäulenmarker (Zoomstufe > 10)
    async function loadCityStations(citySlug) { 
      console.log("loadCityStations called", citySlug, loadedCities);

      if (loadedCities.has(citySlug)) return;
      
      loadedCities.add(citySlug);

      try { 
        const responseCharging = await fetch(`https://infranode.dev/api/v1/cities/${citySlug}/charging`);

        if (!responseCharging.ok) {
          throw new Error(`HTTP-Fehler! Status: ${responseCharging.status}`);
        }

        const responseDataCharging = await responseCharging.json(); 
        const chargingStations = responseDataCharging.data.payload.stations; 

        console.log("Stations try-loop entered");
          
        chargingStations.forEach(station => { 
          if (station.lat && station.lon) { 
            const stationId = station.station_id;

            //Ladesäulenmarker
            const isFav = favoritesMap.has(stationId);
            const stationMarker = new Marker([station.lat, station.lon], { icon: isFav ? favoriteIcon : defaultIcon });

            stationMarkersMap.set(stationId, stationMarker);

            stationMarker.bindTooltip(`<b>${station.operator || 'Ladesäule'}, ID:${station.station_id || 'Unknown'}</b><br />${station.charging_type || ''}`); 

            stationMarker.on('pointerover', function () { this.openTooltip(); });  
            stationMarker.on('pointerout', function () { this.closeTooltip(); });
                
            stationMarker.on('click', () => { 
              if(Auth.isLoggedIn()){
                if (favoritesMap.has(stationId)) { //war schon Favorit -> nicht mehr Favorit
                  favoritesMap.delete(stationId); 
                  stationMarker.setIcon(defaultIcon); 
                  console.log(`Aus Favoriten entfernt: ${stationId}`);
                } else { // war kein Favorit -> Favorit
                  favoritesMap.set(stationId, station); 
                  stationMarker.setIcon(favoriteIcon); 
                  console.log(`Als Favorit gespeichert: ${stationId}`); 
                }

                saveFavoritesToSession()
                renderFavoritesList();
              } else {
                stationMarker.bindPopup('Melde Dich an, um Favoriten zu speichern: <a href="login.html">Zum Login</a>');
              }              
            });
            stationsLayer.addLayer(stationMarker); 
          }
        });
      } catch (err) { 
        console.error(`Fehler beim Laden der Säulen für ${citySlug}:`, err); 
      } 
    }

  //Favoriten-SideBar
    function renderSidebar() { 
      console.log("renderSidebar() called");
      const mapContents = document.getElementById("mapContents"); 

      if (!mapContents) return;

      let aside = document.getElementById("favorites");
      let ul;

      if (!aside){
        const loginAd = document.getElementById("loginAd");
        loginAd.style.display = "none";

        aside = document.createElement("aside");
        aside.id = "favorites";
        mapContents.appendChild(aside);

        const heading = document.createElement("h4");
        heading.textContent = "Meine Favoriten";
        aside.appendChild(heading);

        const clearAllBtn = document.createElement("button");
        clearAllBtn.id = "btn-delete";
        clearAllBtn.style.display = 'none';
        aside.appendChild(clearAllBtn);

        ul = document.createElement("ul");
        ul.id = "fav-list";
        aside.appendChild(ul);
      } else {
        ul = aside.querySelector("ul");
        if (ul) {
            ul.innerHTML = "";
        }
      }
      
      if (ul) {
        renderFavoritesList();
      }
    }

    //Favoritenliste
    function renderFavoritesList(){
      console.log("renderFavoritesList() called")

      const clearAllBtn = document.getElementById("btn-delete");
      const ul = document.getElementById("fav-list");

      ul.innerHTML = "";
      clearAllBtn.style.display = "none";

      if (favoritesMap.size === 0){
        const li = document.createElement('li');
        li.className = "fav-item"
        li.textContent = "Noch keine Favoriten gespeichert";
        ul.appendChild(li);
        return;
      }

      favoritesMap.forEach((station, stationId) => {
        const li = document.createElement('li');
        li.className = "fav-item";
        li.innerHTML = ` <b>${station.operator || 'Ladesäule'}, ID:${station.station_id || 'Unknown'}</b><br /> ${station.charging_type || ''}, ${station.post_code || ''} `; 

        li.addEventListener('click', () => { 
          if (station.lat && station.lon) { 
            map.setView([station.lat, station.lon], 14); 
            const marker = stationMarkersMap.get(stationId); 
            if (marker) { marker.openPopup(); } 
          } 
        }); 

        ul.appendChild(li);

        const clearAllBtn = document.getElementById("btn-delete");
        clearAllBtn.style.display = 'block';
        clearAllBtn.className = 'btn-clear-all';
        clearAllBtn.textContent = `Alle Einträge löschen (${favoritesMap.size})`;
          
        clearAllBtn.addEventListener('click', () => {
          favoritesMap.clear();
          stationMarkersMap.forEach((marker) => {
            const isFav = favoritesMap.has(stationId);
            marker.setIcon(isFav ? favoriteIcon : defaultIcon);
          });
          saveFavoritesToSession();
          renderFavoritesList(); 
        });
      });
    }

    //delay für weniger häufige API-Calls
    function debounce(func, delay) { 
      let timeoutId; 
      return function (...args) { 
        clearTimeout(timeoutId); 
        timeoutId = setTimeout(() => func.apply(this, args), delay); 
      }; 
    }

    map.on('moveend', debounce(() => {
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