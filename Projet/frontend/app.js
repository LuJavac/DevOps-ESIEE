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
  resultLimitInput: document.getElementById('result-limit'),
  travelModeInput: document.getElementById('travel-mode'),
  latInput: document.getElementById('lat'),
  lonInput: document.getElementById('lon'),
  selectedLocation: document.getElementById('selected-location'),
  geocodeResults: document.getElementById('geocode-results'),
  status: document.getElementById('status'),
  resultCount: document.getElementById('result-count'),
  resultsSort: document.getElementById('results-sort'),
  results: document.getElementById('results'),
  apiStatus: document.getElementById('api-status'),
  appVersion: document.getElementById('app-version')
};

const state = {
  lat: null,
  lon: null,
  label: '',
  lastResults: [],
  lastTravelMode: 'driving'
};

function setStatus(message, level = 'neutral') {
  dom.status.textContent = message || '';
  dom.status.className = `status ${level}`;
}

function setButtonLoading(button, isLoading, defaultText, loadingText) {
  if (!button) {
    return;
  }
  button.disabled = isLoading;
  button.classList.toggle('is-loading', isLoading);
  button.textContent = isLoading ? loadingText : defaultText;
}

function setApiBadge(stateLabel) {
  if (!dom.apiStatus) {
    return;
  }

  if (stateLabel === 'ok') {
    dom.apiStatus.className = 'api-pill ok';
    dom.apiStatus.textContent = 'API: OK';
    return;
  }

  if (stateLabel === 'ko') {
    dom.apiStatus.className = 'api-pill ko';
    dom.apiStatus.textContent = 'API: KO';
    return;
  }

  dom.apiStatus.className = 'api-pill pending';
  dom.apiStatus.textContent = 'API: ...';
}

function setSelectedLocation(lat, lon, label, sourceClass) {
  state.lat = lat;
  state.lon = lon;
  state.label = label || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;

  dom.latInput.value = lat.toFixed(6);
  dom.lonInput.value = lon.toFixed(6);
  dom.selectedLocation.className = `location-pill ${sourceClass}`;
  dom.selectedLocation.textContent = `Localisation active : ${state.label}`;
}

function clearSelectedLocation() {
  state.lat = null;
  state.lon = null;
  state.label = '';
  dom.latInput.value = '';
  dom.lonInput.value = '';
  dom.selectedLocation.className = 'location-pill neutral';
  dom.selectedLocation.textContent = 'Aucune localisation sélectionnée.';
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
    setStatus('Adresse sélectionnée.', 'success');
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
  title.textContent = "Suggestions d'adresses :";
  dom.geocodeResults.appendChild(title);

  results.forEach((result) => {
    dom.geocodeResults.appendChild(createSuggestionNode(result));
  });
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

async function geocodeAddress(autoSelect = false, fromButton = false) {
  const query = buildAddressQuery();

  if (!query) {
    setStatus('Saisis une adresse, un code postal et/ou une ville.', 'error');
    return null;
  }

  if (fromButton) {
    setButtonLoading(dom.geocodeBtn, true, 'Utiliser cette adresse', 'Chargement...');
  }
  setStatus("Chargement de l'adresse...", 'info');

  try {
    const params = new URLSearchParams({ query, limit: '5' });
    const response = await fetch(`${API_BASE}/location/geocode?${params.toString()}`);
    const payload = await parseJsonSafe(response);

    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error || 'API indisponible');
    }

    const results = (payload.data || []).filter((item) => hasValidCoordinates(item.lat, item.lon));
    renderGeocodeSuggestions(results);

    if (!results.length) {
      setStatus('Adresse introuvable. Essaie une autre saisie.', 'error');
      return null;
    }

    if (autoSelect || results.length === 1) {
      const first = results[0];
      setSelectedLocation(first.lat, first.lon, first.displayName, 'address');
      setStatus('Adresse géolocalisée avec succès.', 'success');
      return first;
    }

    setStatus('Sélectionne une adresse dans la liste.', 'info');
    return results[0];
  } catch (error) {
    setStatus("Impossible de contacter l'API pour géocoder cette adresse.", 'error');
    return null;
  } finally {
    if (fromButton) {
      setButtonLoading(dom.geocodeBtn, false, 'Utiliser cette adresse', 'Chargement...');
    }
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

function sortedResults(items) {
  const sortValue = dom.resultsSort?.value || 'distance_asc';
  const copy = [...items];

  if (sortValue === 'distance_desc') {
    return copy.sort((a, b) => Number(b.distance_km || 0) - Number(a.distance_km || 0));
  }

  if (sortValue === 'name_asc') {
    return copy.sort((a, b) => String(a.equip_nom || '').localeCompare(String(b.equip_nom || ''), 'fr'));
  }

  if (sortValue === 'name_desc') {
    return copy.sort((a, b) => String(b.equip_nom || '').localeCompare(String(a.equip_nom || ''), 'fr'));
  }

  return copy.sort((a, b) => Number(a.distance_km || 0) - Number(b.distance_km || 0));
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
    setStatus("Aucune adresse à copier.", 'error');
    return;
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    setStatus('Adresse copiée dans le presse-papiers.', 'success');
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
  setStatus('Adresse copiée dans le presse-papiers.', 'success');
}

function renderEmptyResult(message) {
  dom.resultCount.textContent = '0 résultat';
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
  title.textContent = item.equip_nom || 'Équipement sans nom';
  titleWrapper.appendChild(title);

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
  copyBtn.textContent = "Copier l'adresse";
  copyBtn.addEventListener('click', async () => {
    try {
      await copyText(address);
    } catch (error) {
      setStatus("Impossible de copier l'adresse.", 'error');
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
  const orderedItems = sortedResults(items);
  dom.results.innerHTML = '';
  dom.resultCount.textContent = `${orderedItems.length} résultat(s)`;

  if (!orderedItems.length) {
    renderEmptyResult('Aucun équipement trouvé pour ces critères.');
    return;
  }

  orderedItems.forEach((item, index) => {
    dom.results.appendChild(createResultCard(item, travelMode, index));
  });
}

async function resolveCoordinates() {
  const manualCoords = parseManualCoordinates();
  if (manualCoords) {
    setSelectedLocation(
      manualCoords.lat,
      manualCoords.lon,
      `Coordonnées manuelles (${manualCoords.lat.toFixed(5)}, ${manualCoords.lon.toFixed(5)})`,
      'manual'
    );
    return manualCoords;
  }

  if (state.lat !== null && state.lon !== null) {
    return { lat: state.lat, lon: state.lon };
  }

  if (buildAddressQuery()) {
    const geocoded = await geocodeAddress(true, false);
    if (geocoded) {
      return { lat: geocoded.lat, lon: geocoded.lon };
    }
  }

  return null;
}

async function fetchNearbyEquipements() {
  const coordinates = await resolveCoordinates();

  if (!coordinates) {
    setStatus('Sélectionne une localisation (adresse ou GPS) avant la recherche.', 'error');
    return;
  }

  const sport = dom.sportInput.value.trim();
  const radiusKm = Number(dom.radiusInput.value) || 5;
  const resultLimit = Number(dom.resultLimitInput.value) || 25;
  const travelMode = dom.travelModeInput.value || 'driving';

  const params = new URLSearchParams({
    lat: String(coordinates.lat),
    lon: String(coordinates.lon),
    radius_km: String(radiusKm),
    limit: String(resultLimit)
  });

  if (sport) {
    params.set('sport', sport);
  }

  setStatus('Chargement des équipements...', 'info');

  try {
    const response = await fetch(`${API_BASE}/equipements/nearby?${params.toString()}`);
    const payload = await parseJsonSafe(response);

    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error || 'API indisponible');
    }

    const items = payload.data || [];
    state.lastResults = items;
    state.lastTravelMode = travelMode;
    renderResults(items, travelMode);

    if (!items.length) {
      setStatus('Aucun équipement trouvé dans ce rayon.', 'info');
      return;
    }

    setStatus('Recherche terminée.', 'success');
  } catch (error) {
    renderEmptyResult('Impossible de récupérer les résultats pour le moment.');
    setStatus('API indisponible pour le moment.', 'error');
  }
}

function useBrowserLocation() {
  if (!navigator.geolocation) {
    setStatus('La géolocalisation est indisponible sur ce navigateur.', 'error');
    return;
  }

  setButtonLoading(dom.useLocationBtn, true, 'Utiliser ma position GPS', 'Chargement...');
  setStatus('Chargement de la position GPS...', 'info');

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      setSelectedLocation(lat, lon, `Position GPS (${lat.toFixed(5)}, ${lon.toFixed(5)})`, 'gps');
      setStatus('Position GPS détectée.', 'success');
      setButtonLoading(dom.useLocationBtn, false, 'Utiliser ma position GPS', 'Chargement...');
    },
    (error) => {
      if (error.code === error.PERMISSION_DENIED) {
        setStatus('Géolocalisation refusée. Autorise-la puis réessaie.', 'error');
      } else {
        setStatus('Impossible de récupérer la position GPS.', 'error');
      }
      setButtonLoading(dom.useLocationBtn, false, 'Utiliser ma position GPS', 'Chargement...');
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

async function refreshApiStatus() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    const payload = await parseJsonSafe(response);
    if (response.ok && payload?.status === 'OK') {
      setApiBadge('ok');
    } else {
      setApiBadge('ko');
    }
  } catch (error) {
    setApiBadge('ko');
  }
}

async function loadVersion() {
  try {
    const response = await fetch(`${API_BASE}/version`);
    const payload = await parseJsonSafe(response);
    if (!response.ok || !payload?.version || !dom.appVersion) {
      return;
    }
    dom.appVersion.hidden = false;
    dom.appVersion.textContent = `Version: ${payload.version}`;
  } catch (error) {
    return;
  }
}

function resetAll() {
  dom.addressLineInput.value = '';
  dom.postalCodeInput.value = '';
  dom.cityInput.value = '';
  dom.sportInput.value = '';
  dom.radiusInput.value = '5';
  dom.resultLimitInput.value = '25';
  dom.travelModeInput.value = 'driving';
  dom.geocodeResults.innerHTML = '';
  clearSelectedLocation();
  setStatus('Choisis une adresse ou utilise la position GPS pour commencer.', 'neutral');
  renderEmptyResult('Choisis une adresse ou utilise la position GPS pour commencer.');
}

function bindEvents() {
  dom.geocodeBtn.addEventListener('click', () => geocodeAddress(false, true));
  dom.useLocationBtn.addEventListener('click', useBrowserLocation);
  dom.searchBtn.addEventListener('click', fetchNearbyEquipements);
  dom.resetBtn.addEventListener('click', resetAll);
  dom.resultsSort?.addEventListener('change', () => {
    renderResults(state.lastResults, state.lastTravelMode);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
      event.preventDefault();
      fetchNearbyEquipements();
    }
  });
}

bindEvents();
setApiBadge('pending');
refreshApiStatus();
setInterval(refreshApiStatus, 30000);
loadVersion();
setStatus('Choisis une adresse ou utilise la position GPS pour commencer.', 'neutral');
renderEmptyResult('Choisis une adresse ou utilise la position GPS pour commencer.');
