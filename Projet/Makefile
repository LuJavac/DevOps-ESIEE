.PHONY: help install dev test docker-build docker-run k8s-deploy k8s-delete db-start db-stop

help: ## Afficher cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Installer les dépendances
	cd backend && npm install

dev: ## Lancer le serveur en mode développement
	cd backend && npm run dev

test: ## Lancer les tests
	cd backend && npm test

db-start: ## Démarrer PostgreSQL (Docker)
	docker run -d \
		--name equipements-db \
		-e POSTGRES_PASSWORD=devops2026 \
		-e POSTGRES_DB=equipements \
		-p 5432:5432 \
		postgres:15-alpine

db-stop: ## Arrêter PostgreSQL
	docker stop equipements-db
	docker rm equipements-db

db-init: ## Initialiser la base de données (données exemple)
	docker exec -i equipements-db psql -U postgres -d equipements < backend/src/db/init.sql

db-import: ## Importer les données réelles de data.gouv.fr
	cd backend && node src/scripts/import-data.js

docker-build: ## Build de l'image Docker
	cd backend && docker build -t equipements-api:latest .

docker-run: ## Lancer le container Docker
	docker run -p 3000:3000 \
		-e DB_HOST=host.docker.internal \
		equipements-api:latest

k8s-build: ## Build pour Minikube
	eval $$(minikube docker-env) && cd backend && docker build -t equipements-api:latest .

k8s-deploy: ## Déployer sur Kubernetes
	kubectl apply -f kubernetes/postgres.yaml
	kubectl apply -f kubernetes/deployment.yaml

k8s-import: ## Importer les données dans K8s
	kubectl apply -f kubernetes/data-import-job.yaml

k8s-delete: ## Supprimer le déploiement Kubernetes
	kubectl delete -f kubernetes/

k8s-status: ## Vérifier le statut Kubernetes
	@echo "=== Pods ==="
	kubectl get pods
	@echo ""
	@echo "=== Services ==="
	kubectl get services

k8s-logs: ## Voir les logs du backend
	kubectl logs -l app=backend --tail=50 -f

k8s-validate: ## Valider le déploiement K8s
	./validate-k8s.sh

k8s-url: ## Obtenir l'URL de l'API
	@minikube service backend-service --url

db-stats: ## Afficher les statistiques de la base
	docker exec equipements-db psql -U postgres -d equipements -c "SELECT COUNT(*) as total FROM equipements;"

clean: ## Nettoyer les fichiers temporaires
	cd backend && rm -rf node_modules coverage