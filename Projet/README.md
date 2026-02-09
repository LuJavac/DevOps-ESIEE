
Projet/
├── .gitignore                         # Fichiers à ignorer par Git
├── Makefile                           # Commandes simplifiées
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
│   ├── .env.example                   # Template variables d'environnement
│   ├── .dockerignore                  # Fichiers à ignorer par Docker
│   ├── Dockerfile                     # Image Docker du backend
│   ├── package.json                   # Dépendances Node.js
├── kubernetes/
│   ├── postgres.yaml                  # Déploiement PostgreSQL
│   └── deployment.yaml                # Déploiement Backend
└── README.md                          # Documentation principale
