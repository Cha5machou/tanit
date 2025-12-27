# 📊 Stockage des Données

## Base de données utilisée

**Firestore (Google Cloud)** - Utilisée à la fois en développement local et en production.

### Collections principales

#### `users/{userId}`
Stocke les informations de base des utilisateurs :
```json
{
  "role": "user" | "admin",
  "email": "user@example.com",
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### `profiles/{userId}`
Stocke le profil détaillé de l'utilisateur :
```json
{
  "user_id": "user_123",
  "age": 30,
  "sexe": "homme",
  "metier": "Développeur",
  "raison_visite": "tourisme",
  "nationalite": "France",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

#### `poi/{poiId}`
Points d'intérêt (attractions) :
```json
{
  "name": "Musée d'Art",
  "lat": 48.8566,
  "lng": 2.3522,
  "description": "Description de l'attraction"
}
```

#### `quiz/{quizId}`
Questions et réponses des quiz :
```json
{
  "question": "Quelle est la capitale ?",
  "answers": ["Paris", "Lyon", "Marseille"],
  "correct_answer": 0
}
```

#### `events/{eventId}`
Événements de tracking :
```json
{
  "userId": "user_123",
  "type": "login" | "open_map" | "ai_question" | "quiz_start" | ...,
  "metadata": {},
  "createdAt": "2024-01-01T00:00:00Z"
}
```

## Configuration

### Développement local
- Utilise les mêmes credentials Firebase que la production
- Les données sont stockées dans le même projet Firestore
- Pour tester avec des données séparées, créez un projet Firebase de développement

### Production
- Même base Firestore
- Accès sécurisé via Firebase Admin SDK avec credentials de service account

## Sécurité

- Les règles Firestore contrôlent l'accès aux données
- Les utilisateurs ne peuvent accéder qu'à leurs propres données
- Les admins peuvent accéder à toutes les données de la plateforme

