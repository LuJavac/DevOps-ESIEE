#!/bin/bash

# Script de test de l'API Kubernetes avec port alternatif
# Usage: ./test-k8s-api-alt.sh [port]

PORT=${1:-8081}
API_URL="http://localhost:$PORT"

echo "🧪 Test de l'API Kubernetes"
echo "=============================="
echo "Port: $PORT"
echo ""

# Vérifier si le port est occupé
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port $PORT déjà occupé. Choisir un autre port:"
    echo "   ./test-k8s-api-alt.sh 8081"
    exit 1
fi

# Démarrer le port-forward en arrière-plan
echo "🔌 Démarrage du port-forward sur le port $PORT..."
kubectl port-forward service/backend-service $PORT:3000 > /dev/null 2>&1 &
PF_PID=$!

# Attendre que le port-forward soit prêt
echo "⏳ Attente de la connexion..."
sleep 3

# Fonction de nettoyage
cleanup() {
    echo ""
    echo "🧹 Nettoyage..."
    kill $PF_PID 2>/dev/null
    exit 0
}

trap cleanup EXIT INT TERM

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test 1: Health Check
echo -n "1. Health check... "
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/health 2>/dev/null)
if [ "$RESPONSE" -eq 200 ]; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAIL${NC} (HTTP $RESPONSE)"
    echo "   → Vérifier: kubectl logs deployment/backend"
    exit 1
fi

# Test 2: Stats endpoint
echo -n "2. Endpoint /stats... "
STATS=$(curl -s $API_URL/equipements/stats 2>/dev/null)
if echo "$STATS" | grep -q "total"; then
    TOTAL=$(echo "$STATS" | jq -r '.stats.total' 2>/dev/null)
    if [ -n "$TOTAL" ] && [ "$TOTAL" -gt 0 ]; then
        echo -e "${GREEN}✅ OK${NC} ($TOTAL équipements)"
    else
        echo -e "${YELLOW}⚠️  OK mais 0 équipements${NC}"
    fi
else
    echo -e "${RED}❌ FAIL${NC}"
    echo "$STATS" | head -3
fi

# Test 3: Liste avec pagination
echo -n "3. Pagination... "
RESPONSE=$(curl -s "$API_URL/equipements?page=1&limit=5" 2>/dev/null)
if echo "$RESPONSE" | grep -q "pagination"; then
    COUNT=$(echo "$RESPONSE" | jq -r '.count' 2>/dev/null)
    echo -e "${GREEN}✅ OK${NC} ($COUNT résultats)"
else
    echo -e "${RED}❌ FAIL${NC}"
fi

# Test 4: Filtre par commune
echo -n "4. Filtre commune... "
RESPONSE=$(curl -s "$API_URL/equipements?commune=Châtenay&limit=3" 2>/dev/null)
if echo "$RESPONSE" | grep -q "Châtenay"; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${YELLOW}⚠️  Pas de données Châtenay${NC}"
fi

# Test 5: Filtre accessibilité
echo -n "5. Filtre PMR... "
RESPONSE=$(curl -s "$API_URL/equipements?accessible=true&limit=3" 2>/dev/null)
if echo "$RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAIL${NC}"
fi

# Test 6: Recherche
echo -n "6. Recherche textuelle... "
RESPONSE=$(curl -s "$API_URL/equipements?search=basket&limit=3" 2>/dev/null)
if echo "$RESPONSE" | grep -q "basket"; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${YELLOW}⚠️  Pas de résultats basket${NC}"
fi

# Test 7: CRUD - Créer
echo -n "7. POST (créer)... "
NEW_EQUIP=$(cat <<EOF
{
  "equip_numero": "K8S_TEST_$(date +%s)",
  "equip_nom": "Test Kubernetes",
  "commune_nom": "Paris"
}
EOF
)
RESPONSE=$(curl -s -X POST $API_URL/equipements \
  -H "Content-Type: application/json" \
  -d "$NEW_EQUIP" 2>/dev/null)
if echo "$RESPONSE" | grep -q "success"; then
    ID=$(echo "$RESPONSE" | jq -r '.data.id' 2>/dev/null)
    echo -e "${GREEN}✅ OK${NC} (ID: $ID)"
    
    # Test 8: CRUD - Lire
    echo -n "8. GET by ID... "
    GET_RESP=$(curl -s "$API_URL/equipements/$ID" 2>/dev/null)
    if echo "$GET_RESP" | grep -q "Test Kubernetes"; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ FAIL${NC}"
    fi
    
    # Test 9: CRUD - Modifier
    echo -n "9. PUT (modifier)... "
    UPDATE=$(curl -s -X PUT "$API_URL/equipements/$ID" \
      -H "Content-Type: application/json" \
      -d '{"equip_nom": "Test K8s Modifié"}' 2>/dev/null)
    if echo "$UPDATE" | grep -q "Modifié"; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ FAIL${NC}"
    fi
    
    # Test 10: CRUD - Supprimer
    echo -n "10. DELETE (supprimer)... "
    DELETE=$(curl -s -X DELETE "$API_URL/equipements/$ID" 2>/dev/null)
    if echo "$DELETE" | grep -q "success"; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ FAIL${NC}"
    fi
else
    echo -e "${RED}❌ FAIL${NC}"
fi

echo ""
echo "=============================="
echo -e "${GREEN}✅ Tests terminés !${NC}"
echo "=============================="
echo ""
echo "📊 Statistiques complètes:"
curl -s $API_URL/equipements/stats 2>/dev/null | jq '.stats' || echo "jq non installé"
echo ""
echo "🔗 API accessible sur: $API_URL"
echo "   Pour garder le port-forward actif:"
echo "   kubectl port-forward service/backend-service $PORT:3000"