# Checklist Conformite - Consignes Projet Final

## CI (Integration Continue)
- [x] Tests backend automatises (Jest/Supertest)
- [x] Workflow GitHub Actions de tests (`.github/workflows/ci.yml`)
- [x] Build Docker automatise (`.github/workflows/docker-publish.yml`)

## CD (Livraison Continue)
- [x] Workflow de deploiement Kubernetes (`.github/workflows/cd-kubernetes.yml`)
- [x] Deploiement automatise backend + frontend + DB + job import

## Application
- [x] Backend API REST CRUD
- [x] Frontend utilisateur
- [x] Fonction coeur: recherche d'equipements proches par adresse/geolocalisation + sport
- [x] Actions de navigation: Google Maps / Waze
- [x] Copie d'adresse depuis l'interface

## Donnees et base de donnees
- [x] PostgreSQL deployee sur Kubernetes
- [x] Import de donnees publiques (data.gouv.fr)
- [x] Operations lecture/ecriture validees par tests API

## Kubernetes
- [x] Manifests clairs et reproductibles
- [x] Probes de sante backend
- [x] Service frontend expose
- [x] Persistance PostgreSQL via PVC

## Documentation et soutenance
- [x] README technique complet (`README.md`)
- [x] Rapport technique (`docs/rapport-technique.md`)
- [x] Guide video (`docs/demo-video.md`)
- [ ] Lien video final (a completer)
