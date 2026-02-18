const API_BASE = '/api';

const dom = {
  addressLineInput: document.getElementById('address-line'),
  postalCodeInput: document.getElementById('postal-code'),
  cityInput: document.getElementById('city'),
  geocodeBtn: document.getElementById('geocode-address'),
  useLocationBtn: document.getElementById('use-location'),
  searchBtn: document.getElementById('search'),
  resetBtn: document.getElementById('reset'),
  sportInput: document.getElementById('sport'),
  radiusInput: document.getElementById('radius'),
  travelModeInput: document.getElementById('travel-mode'),
  latInput: document.getElementById('lat'),
  lonInput: document.getElementById('lon'),
  selectedLocation: document.getElementById('selected-location'),
  geocodeResults: document.getElementById('geocode-results'),
  status: document.getElementById('status'),
  resultCount: document.getElementById('result-count'),
  results: document.getElementById('results')
};

const state = {
  lat: null,
  lon: null,
  label: ''
};

function setStatus(message, level = 'neutral') {
  dom.status.textContent = message || '';
  dom.status.className = `status ${level}`;
}

function setSelectedLocation(lat, lon, label, sourceClass) {
  state.lat = lat;
  state.lon = lon;
  state.label = label || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;

  dom.latInput.value = lat.toFixed(6);
  dom.lonInput.value = lon.toFixed(6);
  dom.selectedLocation.className = `location-pill ${sourceClass}`;
  dom.selectedLocation.textContent = `Localisation active: ${state.label}`;
}

function clearSelectedLocation() {
  state.lat = null;
  state.lon = null;
  state.label = '';
  dom.latInput.value = '';
  dom.lonInput.value = '';
  dom.selectedLocation.className = 'location-pill neutral';
  dom.selectedLocation.textContent = 'Aucune localisation selectionnee.';
}

function buildAddressQuery() {
  const parts = [
    dom.addressLineInput.value.trim(),
    dom.postalCodeInput.value.trim(),
    dom.cityInput.value.trim()
  ].filter(Boolean);

  if (!parts.length) {
    return '';
  }

  parts.push('France');
  return parts.join(', ');
}

function hasValidCoordinates(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function createSuggestionNode(result) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'suggestion-item';

  const main = document.createElement('span');
  main.className = 'suggestion-main';
  main.textContent = result.displayName || `${result.lat}, ${result.lon}`;

  const sub = document.createElement('span');
  sub.className = 'suggestion-sub';
  sub.textContent = `${result.city || 'Ville inconnue'}${result.postcode ? ` - ${result.postcode}` : ''}`;

  button.appendChild(main);
  button.appendChild(sub);

  button.addEventListener('click', () => {
    setSelectedLocation(result.lat, result.lon, result.displayName, 'address');
    setStatus('Adresse selectionnee.', 'success');
  });

  return button;
}

function renderGeocodeSuggestions(results) {
  dom.geocodeResults.innerHTML = '';

  if (!results.length) {
    return;
  }

  const title = document.createElement('p');
  title.className = 'geocode-title';
  title.textContent = 'Suggestions d adresses:';
  dom.geocodeResults.appendChild(title);

  results.forEach((result) => {
    dom.geocodeResults.appendChild(createSuggestionNode(result));
  });
}

async function geocodeAddress(autoSelect = false) {
  const query = buildAddressQuery();

  if (!query) {
    setStatus('Saisis une adresse, un code postal et/ou une ville.', 'error');
    return null;
  }

  setStatus('Geocodage de l adresse en cours...', 'info');

  try {
    const params = new URLSearchParams({ query, limit: '5' });
    const response = await fetch(`${API_BASE}/location/geocode?${params.toString()}`);
    const payload = await response.json();

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || 'Erreur geocodage');
    }

    const results = (payload.data || []).filter((item) => hasValidCoordinates(item.lat, item.lon));
    renderGeocodeSuggestions(results);

    if (!results.length) {
      setStatus('Aucune adresse trouvee. Verifie la saisie.', 'error');
      return null;
    }

    if (autoSelect || results.length === 1) {
      const first = results[0];
      setSelectedLocation(first.lat, first.lon, first.displayName, 'address');
      setStatus('Adresse geolocalisee avec succes.', 'success');
      return first;
    }

    setStatus('Selectionne une adresse dans la liste ci-dessous.', 'info');
    return results[0];
  } catch (error) {
    setStatus(`Geocodage impossible: ${error.message}`, 'error');
    return null;
  }
}

function parseManualCoordinates() {
  const lat = Number(dom.latInput.value);
  const lon = Number(dom.lonInput.value);

  if (!hasValidCoordinates(lat, lon)) {
    return null;
  }

  return { lat, lon };
}

function normalizeSports(rawSports) {
  if (Array.isArray(rawSports)) {
    return rawSports;
  }

  if (typeof rawSports === 'string' && rawSports.trim()) {
    try {
      const parsed = JSON.parse(rawSports);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      return [rawSports];
    }
    return [rawSports];
  }

  return [];
}

function buildGoogleMapsUrl(lat, lon, travelMode) {
  const params = new URLSearchParams({
    api: '1',
    destination: `${lat},${lon}`,
    travelmode: travelMode
  });

  if (state.lat !== null && state.lon !== null) {
    params.set('origin', `${state.lat},${state.lon}`);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function buildWazeUrl(lat, lon) {
  const params = new URLSearchParams({
    ll: `${lat},${lon}`,
    navigate: 'yes'
  });
  return `https://waze.com/ul?${params.toString()}`;
}

async function copyText(text) {
  if (!text) {
    setStatus('Aucune adresse a copier.', 'error');
    return;
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    setStatus('Adresse copiee dans le presse-papiers.', 'success');
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
  setStatus('Adresse copiee dans le presse-papiers.', 'success');
}

function renderEmptyResult(message) {
  dom.resultCount.textContent = '0 resultat';
  dom.results.innerHTML = '';

  const empty = document.createElement('div');
  empty.className = 'result-empty';
  empty.textContent = message;
  dom.results.appendChild(empty);
}

function createResultCard(item, travelMode, index) {
  const address =
    item.full_address ||
    [item.inst_adresse, item.commune_nom, item.dep_nom].filter(Boolean).join(', ') ||
    `${item.latitude}, ${item.longitude}`;

  const sports = normalizeSports(item.aps_name);
  const card = document.createElement('article');
  card.className = 'result-card';
  card.style.setProperty('--delay', `${index * 55}ms`);

  const top = document.createElement('div');
  top.className = 'card-top';

  const titleWrapper = document.createElement('div');
  const title = document.createElement('h3');
  title.className = 'card-title';
  title.textContent = item.equip_nom || 'Equipement sans nom';

  const rank = document.createElement('span');
  rank.className = 'rank-badge';
  rank.textContent = `Top ${index + 1}`;
  titleWrapper.appendChild(title);
  titleWrapper.appendChild(rank);

  const distance = document.createElement('span');
  distance.className = 'distance-badge';
  distance.textContent = `${Number(item.distance_km || 0).toFixed(2)} km`;

  top.appendChild(titleWrapper);
  top.appendChild(distance);

  const metaType = document.createElement('p');
  metaType.className = 'card-meta';
  metaType.textContent = `Type: ${item.equip_type_name || 'n/a'} | Commune: ${item.commune_nom || 'n/a'}`;

  const metaAddress = document.createElement('p');
  metaAddress.className = 'card-meta';
  metaAddress.textContent = `Adresse: ${address}`;

  const metaSports = document.createElement('p');
  metaSports.className = 'card-meta';
  metaSports.textContent = `Sports: ${sports.length ? sports.slice(0, 5).join(', ') : 'n/a'}`;

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const mapLink = document.createElement('a');
  mapLink.className = 'action';
  mapLink.href = buildGoogleMapsUrl(item.latitude, item.longitude, travelMode);
  mapLink.target = '_blank';
  mapLink.rel = 'noopener noreferrer';
  mapLink.textContent = 'Y aller (Google Maps)';

  const wazeLink = document.createElement('a');
  wazeLink.className = 'action';
  wazeLink.href = buildWazeUrl(item.latitude, item.longitude);
  wazeLink.target = '_blank';
  wazeLink.rel = 'noopener noreferrer';
  wazeLink.textContent = 'Y aller (Waze)';

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'action';
  copyBtn.textContent = 'Copier l adresse';
  copyBtn.addEventListener('click', async () => {
    try {
      await copyText(address);
    } catch (error) {
      setStatus(`Copie impossible: ${error.message}`, 'error');
    }
  });

  actions.appendChild(mapLink);
  actions.appendChild(wazeLink);
  actions.appendChild(copyBtn);

  card.appendChild(top);
  card.appendChild(metaType);
  card.appendChild(metaAddress);
  card.appendChild(metaSports);
  card.appendChild(actions);

  return card;
}

function renderResults(items, travelMode) {
  dom.results.innerHTML = '';
  dom.resultCount.textContent = `${items.length} resultat(s)`;

  if (!items.length) {
    renderEmptyResult('Aucun equipement trouve pour ces criteres.');
    return;
  }

  items.forEach((item, index) => {
    dom.results.appendChild(createResultCard(item, travelMode, index));
  });
}

async function resolveCoordinates() {
  const manualCoords = parseManualCoordinates();
  if (manualCoords) {
    setSelectedLocation(
      manualCoords.lat,
      manualCoords.lon,
      `Coordonnees manuelles (${manualCoords.lat.toFixed(5)}, ${manualCoords.lon.toFixed(5)})`,
      'manual'
    );
    return manualCoords;
  }

  if (state.lat !== null && state.lon !== null) {
    return { lat: state.lat, lon: state.lon };
  }

  if (buildAddressQuery()) {
    const geocoded = await geocodeAddress(true);
    if (geocoded) {
      return { lat: geocoded.lat, lon: geocoded.lon };
    }
  }

  return null;
}

async function fetchNearbyEquipements() {
  const coordinates = await resolveCoordinates();

  if (!coordinates) {
    setStatus('Selectionne une localisation (adresse ou GPS) avant la recherche.', 'error');
    return;
  }

  const sport = dom.sportInput.value.trim();
  const radius = Number(dom.radiusInput.value) || 10;
  const travelMode = dom.travelModeInput.value || 'driving';

  const params = new URLSearchParams({
    lat: String(coordinates.lat),
    lon: String(coordinates.lon),
    radius: String(radius),
    limit: '25'
  });

  if (sport) {
    params.set('sport', sport);
  }

  setStatus('Recherche des equipements en cours...', 'info');

  try {
    const response = await fetch(`${API_BASE}/equipements/nearby?${params.toString()}`);
    const payload = await response.json();

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || 'Erreur API');
    }

    renderResults(payload.data || [], travelMode);
    setStatus('Recherche terminee.', 'success');
  } catch (error) {
    renderEmptyResult('Impossible de recuperer les resultats pour le moment.');
    setStatus(`Erreur: ${error.message}`, 'error');
  }
}

function useBrowserLocation() {
  if (!navigator.geolocation) {
    setStatus('La geolocalisation est indisponible sur ce navigateur.', 'error');
    return;
  }

  setStatus('Recuperation de la position GPS...', 'info');

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      setSelectedLocation(lat, lon, `Position GPS (${lat.toFixed(5)}, ${lon.toFixed(5)})`, 'gps');
      setStatus('Position GPS detectee.', 'success');
    },
    (error) => {
      setStatus(`Impossible de recuperer la position: ${error.message}`, 'error');
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function resetAll() {
  dom.addressLineInput.value = '';
  dom.postalCodeInput.value = '';
  dom.cityInput.value = '';
  dom.sportInput.value = '';
  dom.radiusInput.value = '10';
  dom.travelModeInput.value = 'driving';
  dom.geocodeResults.innerHTML = '';
  setStatus('', 'neutral');
  clearSelectedLocation();
  renderEmptyResult('Saisis une adresse ou active la position GPS pour commencer.');
}

function bindEvents() {
  dom.geocodeBtn.addEventListener('click', () => geocodeAddress(false));
  dom.useLocationBtn.addEventListener('click', useBrowserLocation);
  dom.searchBtn.addEventListener('click', fetchNearbyEquipements);
  dom.resetBtn.addEventListener('click', resetAll);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
      event.preventDefault();
      fetchNearbyEquipements();
    }
  });
}

bindEvents();
renderEmptyResult('Saisis une adresse ou active la position GPS pour commencer.');
