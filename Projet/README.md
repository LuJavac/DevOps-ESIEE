
Projet/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── equipements.js         # Logique métier CRUD
│   │   ├── db/
│   │   │   ├── index.js               # Connexion PostgreSQL
│   │   │   └── init.sql               # Script d'initialisation DB
│   │   ├── routes/
│   │   │   └── equipements.js         # Routes CRUD
│   │   └── app.js                     # Point d'entrée Express
│   ├── tests/
│   │   └── api.test.js                # Tests Jest
│   ├── .dockerignore                  # Fichiers à ignorer par Docker
│   ├── .env.example                   # Template variables d'environnement
│   ├── Dockerfile                     # Image Docker du backend
│   └── package.json                   # Dépendances Node.js
├── docs/
│   ├── api-stats-k8s.json
│   ├── api-tests-results.txt
│   ├── backend-deployment-details.txt
│   ├── backend-logs.txt
│   ├── backend-service-details.txt
│   └── kubernetes-deployment-state.txt
├── kubernetes/
│   ├── data-import-job.yaml
│   ├── deployment.yaml                # Déploiement Backend
│   └── postgres.yaml                  # Déploiement PostgreSQL
├── .gitignore                         # Fichiers à ignorer par Git
├── Makefile                           # Commandes simplifiées
└── README.md                          # Documentation principale
