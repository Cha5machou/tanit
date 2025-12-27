# 👤 Gestion des Rôles Utilisateur

## Comment définir un utilisateur comme admin

Il existe **3 méthodes** pour définir un utilisateur comme admin :

### Méthode 1 : Via l'interface Admin (Recommandé)

1. Connectez-vous avec un compte qui a déjà le rôle admin
2. Allez dans `/admin/users`
3. Trouvez l'utilisateur dans la liste
4. Changez son rôle de "User" à "Admin" dans le menu déroulant
5. Le changement est appliqué immédiatement

### Méthode 2 : Via la Console Firebase (Manuel)

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionnez votre projet
3. Allez dans **Firestore Database**
4. Trouvez la collection `users`
5. Cliquez sur le document de l'utilisateur (l'ID est l'UID Firebase)
6. Modifiez le champ `role` :
   - Changez `"user"` en `"admin"`
7. Sauvegardez

### Méthode 3 : Via l'API (Programmatique)

#### Avec curl :

```bash
# Récupérer votre token Firebase (depuis le frontend)
TOKEN="your-firebase-id-token"

# Mettre à jour le rôle d'un utilisateur
curl -X PUT "http://localhost:8000/api/v1/auth/users/{USER_ID}/role" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

#### Avec Python :

```python
import requests

token = "your-firebase-id-token"
user_id = "user-uid-from-firebase"

response = requests.put(
    f"http://localhost:8000/api/v1/auth/users/{user_id}/role",
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    },
    json={"role": "admin"}
)
```

## Comment obtenir le premier admin

Pour créer le **premier admin**, vous devez utiliser la **Méthode 2** (Console Firebase) :

1. Connectez-vous à votre application avec votre compte Google
2. Notez votre UID Firebase (visible dans les logs ou dans Firebase Console > Authentication)
3. Allez dans Firestore Database > Collection `users`
4. Créez un document avec votre UID comme ID du document
5. Ajoutez les champs :
   ```json
   {
     "role": "admin",
     "email": "votre-email@gmail.com",
     "created_at": "2024-01-01T00:00:00Z"
   }
   ```
6. Reconnectez-vous à l'application

## Structure des données

### Collection `users/{userId}`

```json
{
  "role": "user" | "admin",
  "email": "user@example.com",
  "created_at": "2024-01-01T00:00:00Z"
}
```

## API Endpoints

### Lister tous les utilisateurs (Admin seulement)

```http
GET /api/v1/auth/users
Authorization: Bearer {token}
```

### Mettre à jour le rôle d'un utilisateur (Admin seulement)

```http
PUT /api/v1/auth/users/{user_id}/role
Authorization: Bearer {token}
Content-Type: application/json

{
  "role": "admin" | "user"
}
```

## Vérification du rôle

### Frontend

```typescript
import { useRole } from '@/hooks/useRole'

const { isAdmin, role } = useRole()

if (isAdmin()) {
  // Accès admin
}
```

### Backend

```python
from app.api.deps import get_current_user_with_role

@router.get("/admin-only")
async def admin_endpoint(
    current_admin = Depends(get_current_user_with_role(required_role="admin"))
):
    # Seuls les admins peuvent accéder
    pass
```

## Sécurité

- Seuls les utilisateurs avec le rôle `admin` peuvent modifier les rôles
- Les rôles sont stockés dans Firestore et vérifiés à chaque requête
- Les règles Firestore doivent être configurées pour protéger les données

