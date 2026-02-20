# Projet Final DevOps - ProxiSport

ProxiSport est une application qui transforme une adresse en recommandations sportives concretes: geolocalisation du point de depart, classement des equipements les plus proches selon le sport recherche, puis ouverture de l'itineraire en un clic sur Google Maps ou Waze.

## 0) Demarrage evaluateur (recommande)

Objectif: permettre a un correcteur de cloner et lancer l'app sans `make`, sans Node local, sans Minikube.

### Prerequis minimaux
- Docker Desktop (avec Docker Compose)
- Connexion internet (import dataset public)

### Depuis la racine `Projet/`

#### Option A (scripts)
- Windows PowerShell:

```powershell
.\scripts\start-local.ps1
```

- Linux/macOS:

```bash
chmod +x ./scripts/start-local.sh ./scripts/stop-local.sh
./scripts/start-local.sh
```

#### Option B (commandes directes)

```bash
docker compose up -d --build postgres-service backend-service frontend-service
docker compose run --rm data-import-job
```

### URLs
- Frontend: `http://localhost:8080`
- API health: `http://localhost:8080/api/health`

### Arret
- Windows PowerShell:

```powershell
.\scripts\stop-local.ps1
```

- Linux/macOS:

```bash
./scripts/stop-local.sh
```

- Reset complet des donnees:
  - PowerShell: `.\scripts\stop-local.ps1 -ResetData`
  - Bash: `./scripts/stop-local.sh --reset-data`

## 1) Objectif fonctionnel

Le projet realise une web app avec les usages suivants :
- Geolocaliser l'utilisateur par adresse (ville + code postal) ou GPS.
- Filtrer par sport souhaite.
- Retourner les destinations les plus proches (tri par distance).
- Ouvrir directement l'itineraire dans Google Maps ou Waze.
- Copier l'adresse d'un equipement en un clic.

## 2) Stack technique

- Frontend: HTML/CSS/JS (Nginx)
- Backend: Node.js + Express
- Data: PostgreSQL
- Source dataset: data.gouv.fr (equipements sportifs)
- Conteneurs: Docker
- Orchestration: Kubernetes (Minikube ou cluster cloud)
- CI/CD: GitHub Actions
- Tests API: Jest + Supertest

## 3) Architecture

- `frontend` appelle `/api/*` sur le meme domaine.
- Nginx du frontend proxy les requetes `/api` vers `backend-service`.
- `backend` expose API CRUD + endpoint de proximite + endpoint geocode.
- `postgres` stocke les equipements importes.
- `data-import-job` initialise la base en important les donnees publiques.

## 4) Structure du repo

```txt
Projet/
|-- .github/workflows/
|   |-- ci.yml
|   |-- docker-publish.yml
|   `-- cd-kubernetes.yml
|-- backend/
|   |-- src/
|   |   |-- app.js
|   |   |-- server.js
|   |   |-- controllers/equipements.js
|   |   |-- controllers/location.js
|   |   |-- routes/equipements.js
|   |   |-- routes/location.js
|   |   |-- db/index.js
|   |   |-- scripts/import-data.js
|   |   `-- scripts/init-schema.js
|   |-- tests/api.test.js
|   |-- Dockerfile
|   `-- package.json
|-- frontend/
|   |-- app.js
|   |-- styles.css
|   |-- index.html
|   |-- nginx.conf
|   `-- Dockerfile
|-- kubernetes/
|   |-- postgres.yaml
|   |-- deployment.yaml
|   |-- frontend.yaml
|   `-- data-import-job.yaml
|-- scripts/
|   |-- start-local.ps1
|   |-- stop-local.ps1
|   |-- start-local.sh
|   `-- stop-local.sh
|-- docs/
|   |-- rapport-technique.md
|   |-- checklist-conformite.md
|   `-- demo-video.md
|-- docker-compose.yml
|-- Makefile
|-- validate-k8s.sh
`-- test-k8s-api-alt.sh
```

## 5) API

Base path backend: `/`

### Endpoints principaux
- `GET /health`
- `GET /version`
- `GET /location/geocode?query=...`
- `GET /equipements`
- `GET /equipements/nearby?lat=..&lon=..&sport=..&radius_km=..&limit=..`
- `GET /equipements/stats`
- `GET /equipements/:id`
- `POST /equipements`
- `PUT /equipements/:id`
- `DELETE /equipements/:id`

### Endpoint proximite (coeur du besoin)
Exemple:

```bash
curl "http://localhost:3000/equipements/nearby?lat=48.8566&lon=2.3522&sport=football&radius_km=5&limit=10"
```

Le backend:
- valide les coordonnees,
- calcule la distance en km (Haversine SQL),
- filtre optionnellement par sport et rayon,
- trie par distance croissante.
- accepte aussi `radius` pour compatibilite.

### Endpoint version
Exemple:

```bash
curl "http://localhost:3000/version"
```

### Endpoint geocode
Exemple:

```bash
curl "http://localhost:3000/location/geocode?query=10+rue+de+Rivoli,+75001,+Paris&limit=5"
```

Le backend:
- convertit une adresse en latitude/longitude (provider Nominatim),
- retourne plusieurs suggestions d'adresses,
- permet au frontend de selectionner le meilleur point de depart.

## 6) Fonctionnalites frontend

Pour chaque destination, l'UI propose:
- `Y aller (Google Maps)` -> ouvre l'itineraire.
- `Y aller (Waze)` -> ouvre la navigation Waze.
- `Copier l'adresse` -> copie l'adresse complete dans le presse-papiers.

L'utilisateur peut:
- saisir une adresse, un code postal et une ville,
- utiliser sa geolocalisation navigateur,
- ajuster des coordonnees manuelles en option avancee,
- choisir sport, rayon (`radius_km`) et nombre de resultats (`limit`),
- voir l'etat API (`OK/KO`) et la version d'app,
- voir des messages clairs (chargement, adresse introuvable, geoloc refusee, API indisponible).

## 7) Lancement local developpeur

### Prerequis
- Node.js 20+
- Docker

### Backend local (hors Kubernetes)

```bash
make install
make db-start
make db-import
make dev
```

API dispo sur `http://localhost:3000`.

Alternative sans `make` (PowerShell ou bash):

```bash
cd backend
npm ci
```

Puis lancer PostgreSQL avec Docker et importer:

```bash
docker run -d --name equipements-db -e POSTGRES_PASSWORD=devops2026 -e POSTGRES_DB=equipements -p 5432:5432 postgres:15-alpine
cd backend
node src/scripts/import-data.js
npm run dev
```

## 8) Deploiement Kubernetes

### Prerequis
- kubectl
- Minikube

```bash
minikube start --driver=docker
make k8s-build
make k8s-deploy
make k8s-import
make k8s-validate
make k8s-url
```

URL frontend via `make k8s-url`.

## 9) Tests

```bash
make test
```

Alternative sans `make`:

```bash
cd backend
npm test
```

La suite couvre:
- health,
- pagination/filtres,
- endpoint proximite,
- stats,
- CRUD,
- erreurs (404/400/409).

## 10) CI/CD GitHub Actions

### `ci.yml`
- push/PR -> install -> init schema DB -> tests backend.

### `docker-publish.yml`
- push `main`/tag -> build & push images Docker backend + frontend.

### `cd-kubernetes.yml`
- deploiement K8s (workflow_dispatch ou apres publish Docker).
- apply manifests + mise a jour des images + rollout status.

Secrets attendus:
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `KUBE_CONFIG_DATA` (kubeconfig base64)

## 11) Couverture des consignes officielles

- CI: present (tests automatiques)
- CD: present (build/push + deploy K8s)
- Backend: present (API REST CRUD)
- Frontend: present (interface utilisateur complete)
- Base de donnees: present (PostgreSQL + import dataset)
- Kubernetes: present (frontend, backend, postgres, job)
- Documentation technique: presente (ce README + docs)
  

## 12) Equipe

Remy ABDOUL MAZIDOU, Lubin BENOIT, Antoine LI, Yoan ROUL, Lucas TONLOP.
