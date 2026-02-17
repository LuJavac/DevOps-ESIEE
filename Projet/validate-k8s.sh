#!/bin/bash

# Script de validation Kubernetes
# Usage: ./validate-k8s.sh

set -e

echo "🔍 Validation du déploiement Kubernetes"
echo "=========================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher OK ou FAIL
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        return 1
    fi
}

# 1. Vérifier Minikube
echo -n "1. Minikube installé... "
if command -v minikube &> /dev/null; then
    VERSION=$(minikube version --short)
    echo -e "${GREEN}✅ OK${NC} ($VERSION)"
else
    echo -e "${RED}❌ FAIL${NC} - Minikube non installé"
    exit 1
fi

# 2. Vérifier kubectl
echo -n "2. kubectl installé... "
if command -v kubectl &> /dev/null; then
    VERSION=$(kubectl version --client --short 2>/dev/null || kubectl version --client | head -1)
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAIL${NC} - kubectl non installé"
    exit 1
fi

# 3. Vérifier que Minikube tourne
echo -n "3. Minikube status... "
if minikube status &> /dev/null; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Stopped${NC}"
    echo "   → Démarrer avec: minikube start --driver=docker"
    exit 1
fi

echo ""
echo "📦 Vérification des Pods"
echo "========================"

# 4. Vérifier PostgreSQL
echo -n "4. PostgreSQL pod... "
POSTGRES_POD=$(kubectl get pods -l app=postgres -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -n "$POSTGRES_POD" ]; then
    STATUS=$(kubectl get pod $POSTGRES_POD -o jsonpath='{.status.phase}')
    if [ "$STATUS" == "Running" ]; then
        echo -e "${GREEN}✅ Running${NC} ($POSTGRES_POD)"
    else
        echo -e "${YELLOW}⚠️  $STATUS${NC}"
    fi
else
    echo -e "${RED}❌ Not found${NC}"
    echo "   → Déployer avec: kubectl apply -f kubernetes/postgres.yaml"
fi

# 5. Vérifier Backend
echo -n "5. Backend pods (2 replicas)... "
BACKEND_COUNT=$(kubectl get pods -l app=backend --field-selector=status.phase=Running 2>/dev/null | grep -c backend || echo "0")
if [ "$BACKEND_COUNT" -ge 1 ]; then
    echo -e "${GREEN}✅ $BACKEND_COUNT/2 Running${NC}"
else
    echo -e "${RED}❌ 0/2 Running${NC}"
    echo "   → Déployer avec: kubectl apply -f kubernetes/deployment.yaml"
fi

echo ""
echo "🌐 Vérification des Services"
echo "============================="

# 6. Vérifier postgres-service
echo -n "6. postgres-service... "
if kubectl get service postgres-service &> /dev/null; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ Not found${NC}"
fi

# 7. Vérifier backend-service
echo -n "7. backend-service (NodePort)... "
if kubectl get service backend-service &> /dev/null; then
    NODEPORT=$(kubectl get service backend-service -o jsonpath='{.spec.ports[0].nodePort}')
    echo -e "${GREEN}✅ OK${NC} (Port: $NODEPORT)"
else
    echo -e "${RED}❌ Not found${NC}"
fi

echo ""
echo "💾 Vérification des Données"
echo "============================"

# 8. Vérifier le Job d'import
echo -n "8. Job d'import... "
if kubectl get job data-import-job &> /dev/null 2>&1; then
    JOB_STATUS=$(kubectl get job data-import-job -o jsonpath='{.status.succeeded}')
    if [ "$JOB_STATUS" == "1" ]; then
        echo -e "${GREEN}✅ Completed${NC}"
    else
        FAILED=$(kubectl get job data-import-job -o jsonpath='{.status.failed}' 2>/dev/null || echo "0")
        if [ "$FAILED" != "0" ]; then
            echo -e "${RED}❌ Failed${NC}"
            echo "   → Voir logs: kubectl logs job/data-import-job"
        else
            echo -e "${YELLOW}⚠️  In progress${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Not deployed${NC}"
    echo "   → Déployer avec: kubectl apply -f kubernetes/data-import-job.yaml"
fi

# 9. Vérifier les données en base
echo -n "9. Données en base... "
if [ -n "$POSTGRES_POD" ]; then
    COUNT=$(kubectl exec $POSTGRES_POD -- psql -U postgres -d equipements -tAc "SELECT COUNT(*) FROM equipements" 2>/dev/null || echo "0")
    if [ "$COUNT" -gt 1000 ]; then
        echo -e "${GREEN}✅ $COUNT équipements${NC}"
    elif [ "$COUNT" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Seulement $COUNT équipements${NC}"
        echo "   → Importer les données: kubectl apply -f kubernetes/data-import-job.yaml"
    else
        echo -e "${RED}❌ Aucune donnée${NC}"
        echo "   → Table existe? Importer les données."
    fi
else
    echo -e "${YELLOW}⚠️  Cannot check (PostgreSQL not running)${NC}"
fi

echo ""
echo "🔌 Test de l'API"
echo "================="

# 10. Tester l'API
echo -n "10. API accessible... "
API_URL=$(minikube service backend-service --url --format='{{.URL}}' 2>/dev/null | head -n1)
if [ -n "$API_URL" ]; then
    if curl -s -o /dev/null -w "%{http_code}" $API_URL/health | grep -q "200"; then
        echo -e "${GREEN}✅ OK${NC} ($API_URL)"
        
        # Tester endpoint stats
        echo -n "11. Endpoint /stats... "
        STATS=$(curl -s $API_URL/equipements/stats)
        if echo "$STATS" | grep -q "total"; then
            TOTAL=$(echo "$STATS" | jq -r '.stats.total' 2>/dev/null || echo "?")
            echo -e "${GREEN}✅ OK${NC} ($TOTAL équipements)"
        else
            echo -e "${RED}❌ FAIL${NC}"
        fi
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "   → Vérifier logs: kubectl logs deployment/backend"
    fi
else
    echo -e "${RED}❌ Cannot get URL${NC}"
    echo "   → Essayer: kubectl port-forward service/backend-service 3000:3000"
fi

echo ""
echo "=========================================="
echo "📊 Résumé"
echo "=========================================="

# Compter les succès
RUNNING_PODS=$(kubectl get pods --field-selector=status.phase=Running 2>/dev/null | grep -c Running || echo "0")
TOTAL_PODS=$(kubectl get pods 2>/dev/null | grep -c -v NAME || echo "0")

echo "Pods Running: $RUNNING_PODS/$TOTAL_PODS"

if [ "$RUNNING_PODS" -eq "$TOTAL_PODS" ] && [ "$TOTAL_PODS" -gt 0 ]; then
    echo -e "${GREEN}✅ Tous les pods sont Running !${NC}"
else
    echo -e "${YELLOW}⚠️  Certains pods ne sont pas Running${NC}"
fi

echo ""
echo "🚀 Commandes utiles:"
echo "  - Voir les pods: kubectl get pods"
echo "  - Voir les logs backend: kubectl logs deployment/backend"
echo "  - Voir les logs postgres: kubectl logs deployment/postgres"
echo "  - Accéder à l'API: minikube service backend-service"
echo "  - Dashboard: minikube dashboard"
echo ""