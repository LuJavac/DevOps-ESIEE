# Projet - API DevOps

Application CRUD déployée end-to-end : API REST, PostgreSQL, Docker, Kubernetes, CI/CD


## Présentation

Ce projet reprend l'essentiel du cours DevOps - E4 2025-2026.

Il démontre l'assemblage complet d'une stack DevOps :

- **Backend** Node.js/Express exposant une API REST CRUD
- **Données réelles** issues de [data.gouv.fr](https://equipements.sports.gouv.fr/explore/dataset/data-es/export/?location=19,46.71713,2.40576&basemap=ign.planv2) - équipements sportifs d'Île-de-France
- **Base de données** PostgreSQL persistante
- **Conteneurisation** Docker
- **Orchestration** Kubernetes local (Minikube)
- **Tests automatisés** Jest + Supertest
- **CI/CD** GitHub Actions


---

## Structure du projet

```
DevOps-ESIEE/
├── Labs/                          # Labs du cours
└── Projet/
    ├── .github/workflows/
    │   ├── test.yml               # CI : tests automatiques
    │   └── build.yml              # CD : build & push Docker Hub
    ├── backend/
    │   ├── src/
    │   │   ├── app.js             # Application Express
    │   │   ├── controllers/
    │   │   │   └── equipements.js # Logique CRUD + filtres
    │   │   ├── db/
    │   │   │   └── index.js       # Pool PostgreSQL
    │   │   └── routes/
    │   │       └── equipements.js # Définition des routes
    │   ├── tests/
    │   │   └── api.test.js        # 21 tests Jest/Supertest
    │   ├── Dockerfile
    │   └── package.json
    ├── kubernetes/
    │   ├── postgres.yaml          # Déploiement PostgreSQL
    │   ├── deployment.yaml        # Déploiement Backend (2 replicas)
    │   └── data-import-job.yaml   # Job d'import des données
    ├── Makefile                   # Commandes raccourcies
    └── README.md
```

---

## Démarrage rapide

### Prérequis

- [Node.js 18+](https://nodejs.org/)
- [Docker](https://www.docker.com/)
- [Minikube](https://minikube.sigs.k8s.io/docs/start/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)

### Développement local

```bash
# 1. Cloner
git clone https://github.com/VOTRE-USERNAME/DevOps-ESIEE.git
cd DevOps-ESIEE/Projet

# 2. Installer les dépendances
make install

# 3. Démarrer PostgreSQL
make db-start

# 4. Importer les données réelles
make db-import

# 5. Lancer l'API
make dev
# -> http://localhost:3000
```

### Déploiement Kubernetes

```bash
# 1. Démarrer Minikube
minikube start --driver=docker

# 2. Builder l'image dans le contexte Minikube
make k8s-build

# 3. Déployer (PostgreSQL + Backend + Job d'import)
make k8s-deploy
kubectl apply -f kubernetes/data-import-job.yaml

# 4. Vérifier
make k8s-status
# NAME                        READY   STATUS      
# backend-xxx                 1/1     Running     
# backend-yyy                 1/1     Running     
# postgres-zzz                1/1     Running     

# 5. Accéder à l'API (WSL2)
kubectl port-forward service/backend-service 8081:3000
# -> http://localhost:8081
```

---

## API Reference

Base URL : `http://localhost:3000`

### Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/health` | Statut de l'API |
| `GET` | `/equipements` | Liste paginée |
| `GET` | `/equipements/stats` | Statistiques globales |
| `GET` | `/equipements/:id` | Détail d'un équipement |
| `POST` | `/equipements` | Créer un équipement |
| `PUT` | `/equipements/:id` | Modifier un équipement |
| `DELETE` | `/equipements/:id` | Supprimer un équipement |

### Paramètres de filtrage

| Paramètre | Exemple | Description |
|-----------|---------|-------------|
| `page` | `?page=2` | Numéro de page |
| `limit` | `?limit=20` | Résultats par page (max 100) |
| `commune` | `?commune=Paris` | Filtrer par commune |
| `type` | `?type=piscine` | Filtrer par type d'équipement |
| `accessible` | `?accessible=true` | Équipements PMR uniquement |
| `search` | `?search=stade` | Recherche dans nom/installation |

### Exemples

```bash
# Health check
curl http://localhost:3000/health

# Statistiques
curl http://localhost:3000/equipements/stats | jq

# Liste paginée
curl "http://localhost:3000/equipements?page=1&limit=10" | jq

# Filtres combinés
curl "http://localhost:3000/equipements?commune=Paris&accessible=true" | jq

# Créer
curl -X POST http://localhost:3000/equipements \
  -H "Content-Type: application/json" \
  -d '{"equip_numero":"NEW001","equip_nom":"Stade Demo","commune_nom":"Paris"}'

# Modifier
curl -X PUT http://localhost:3000/equipements/1 \
  -H "Content-Type: application/json" \
  -d '{"equip_nom":"Stade Modifié"}'

# Supprimer
curl -X DELETE http://localhost:3000/equipements/1
```

### Exemple de réponse `/equipements/stats`

```json
{
  "success": true,
  "stats": {
    "total": 1001,
    "communes": 349,
    "accessible": 262,
    "byType": [
      { "equip_type_famille": "Court de tennis", "count": "124" },
      { "equip_type_famille": "Equipement d'activités de forme et de santé", "count": "109" }
    ],
    "byCommune": [
      { "commune_nom": "Paris 14e Arrondissement", "count": "29" },
      { "commune_nom": "Paris 12e Arrondissement", "count": "29" }
    ]
  }
}
```

---

## Tests

```bash
# Lancer les tests
make test

# Résultat attendu
# Tests: 21 passed, 21 total
# Coverage: ~85%
```

Les tests couvrent l'ensemble des endpoints :

- Health check
- Pagination et paramètres
- Tous les filtres (commune, type, PMR, recherche)
- Endpoint statistiques
- CRUD complet (Create / Read / Update / Delete)
- Gestion des erreurs (404, 400, 409)

Chaque test est autonome : il crée ses propres données et nettoie après exécution.

---

## CI/CD

Deux workflows GitHub Actions :

### `test.yml` — déclenché sur chaque push et PR

```
push/PR → checkout → Node 18 → PostgreSQL service → npm install → npm test
```

### `build.yml` — déclenché sur push vers `main`

```
push main → checkout → Docker Buildx → login Docker Hub → build & push image
```

Les secrets nécessaires dans GitHub (`Settings → Secrets → Actions`) :

| Secret | Description |
|--------|-------------|
| `DOCKER_USERNAME` | Votre username Docker Hub |
| `DOCKER_TOKEN` | Access token Docker Hub |

---

## Docker

```bash
# Build
make docker-build

# Run (avec une DB locale)
make docker-run
```

Image disponible sur Docker Hub : `votre-username/equipements-api:latest`

---

## Makefile - commandes disponibles

```bash
make help         # Afficher toutes les commandes

# Développement
make install      # npm install
make dev          # Lancer en mode watch
make test         # Lancer les tests

# Base de données
make db-start     # Démarrer PostgreSQL (Docker)
make db-stop      # Arrêter PostgreSQL
make db-import    # Importer les données data.gouv.fr
make db-stats     # Compter les équipements en base

# Docker
make docker-build # Builder l'image
make docker-run   # Lancer le container

# Kubernetes
make k8s-build    # Builder l'image dans Minikube
make k8s-deploy   # Déployer sur K8s
make k8s-status   # Voir pods et services
make k8s-logs     # Logs du backend en temps réel
make k8s-delete   # Supprimer le déploiement

make clean        # Supprimer node_modules et coverage
```


---

## Variables d'environnement

Copier `.env.example` vers `.env` :

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=equipements
DB_USER=postgres
DB_PASSWORD=devops2026
```

⚠️Dans le cadre de ce projet, les mots de passe sont volontairement laissés en clair dans les fichiers versionnés. Cela pour simplifier la prise en main et le déploiement local pour tous les membres de l'équipe, sans gestion complexe de secrets.
En production, utiliser des Kubernetes Secrets ou un gestionnaire de secrets.

---

## Équipe


Rémy ABDOUL MAZIDOU, Lubin BENOIT, Antoine LI, Yoan ROUL & Lucas TONLOP.

E4 DSIA - ESIEE Paris
