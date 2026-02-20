# Rapport Technique - Projet Final DevOps

## Resume

Le projet implemente une application "Sport Pres de Moi" avec:
- backend API REST CRUD,
- frontend de recherche par adresse (ville/code postal) ou geolocalisation,
- base PostgreSQL,
- deploiement Kubernetes,
- pipeline CI/CD GitHub Actions.

## Architecture

1. Frontend (Nginx)
- sert les assets statiques,
- proxy `/api/*` vers le backend.

2. Backend (Node.js/Express)
- expose les endpoints CRUD,
- expose `/location/geocode` pour convertir adresse -> coordonnees,
- expose `/equipements/nearby` avec calcul de distance,
- interroge PostgreSQL.

3. PostgreSQL
- stocke les equipements,
- index sur colonnes de recherche,
- import de donnees publiques via job.

4. Kubernetes
- `postgres.yaml`: DB + PVC
- `deployment.yaml`: backend + service
- `frontend.yaml`: frontend + service NodePort
- `data-import-job.yaml`: initialisation data

## Choix techniques

- Haversine en SQL: tri rapide par distance sans service externe.
- Geocodage adresse via provider cartographique: l'utilisateur ne saisit plus de lat/lon.
- Frontend statique: simple, rapide et deployable facilement.
- Nginx reverse proxy: pas de probleme CORS, un seul point d'entree.
- CI/CD separe en 3 workflows: test, publish images, deployment.

## Scenarios testes

- Health check.
- Geocodage d'adresse et selection de suggestion.
- Recherche paginee + filtres.
- Recherche par proximite avec coordonnees.
- Filtre sport sur endpoint proximite.
- CRUD complet (create/read/update/delete).
- Statistiques globales.

## Procedure de demo conseillee

1. Montrer `make k8s-build && make k8s-deploy && make k8s-import`.
2. Ouvrir le frontend (URL Minikube).
3. Activer geolocalisation.
4. Saisir un sport (ex: football).
5. Lancer recherche et montrer tri par distance.
6. Cliquer:
   - "Y aller (Google Maps)",
   - "Y aller (Waze)",
   - "Copier l'adresse".
7. Montrer `make test` et pipeline GitHub Actions.

## Points de conformite (consignes)

- CI: OK
- CD: OK
- CRUD + DB: OK
- Frontend + backend + k8s: OK
- Documentation: OK
  
