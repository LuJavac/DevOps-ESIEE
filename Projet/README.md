
Projet/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   └── equipements.js         # Routes CRUD
│   │   ├── controllers/
│   │   │   └── equipements.js         # Logique métier CRUD
│   │   ├── db/
│   │   │   ├── index.js               # Connexion PostgreSQL
│   │   │   └── init.sql               # Script d'initialisation DB
│   │   └── app.js                     # Point d'entrée Express
│   ├── tests/
│   │   └── api.test.js                # Tests Jest
│   ├── .dockerignore                  # Fichiers à ignorer par Docker
│   ├── .env.example                   # Template variables d'environnement
│   ├── Dockerfile                     # Image Docker du backend
│   ├── package.json                   # Dépendances Node.js
├── kubernetes/
│   ├── postgres.yaml                  # Déploiement PostgreSQL
│   └── deployment.yaml                # Déploiement Backend
├── .gitignore                         # Fichiers à ignorer par Git
├── Makefile                           # Commandes simplifiées
└── README.md                          # Documentation principale
