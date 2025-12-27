#!/bin/bash

# Script pour démarrer avec Docker Compose (mode développement)

set -e

echo "🐳 Démarrage de City Platform avec Docker Compose..."

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Installez Docker Desktop."
    exit 1
fi

# Vérifier que Docker Compose est disponible
if ! docker compose version &> /dev/null && ! docker-compose version &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé."
    exit 1
fi

# Vérifier que les fichiers d'environnement existent
if [ ! -f "backend/.env" ]; then
    echo "⚠️  backend/.env n'existe pas. Créez-le à partir de backend/.env.example"
    exit 1
fi

if [ ! -f "frontend/.env.local" ]; then
    echo "⚠️  frontend/.env.local n'existe pas. Créez-le à partir de frontend/env.example"
    exit 1
fi

# Utiliser docker-compose ou docker compose selon ce qui est disponible
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

# Mode développement par défaut
MODE=${1:-dev}

if [ "$MODE" = "prod" ]; then
    echo "🚀 Mode production"
    $COMPOSE_CMD up --build
else
    echo "🔧 Mode développement (avec hot reload)"
    $COMPOSE_CMD -f docker-compose.dev.yml up --build
fi

