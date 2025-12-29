# Configuration du Cron Job pour Fermer les Visites Inactives

## Vue d'ensemble

Le système de tracking des visites de pages nécessite un cron job pour fermer automatiquement les visites qui sont restées inactives pendant plus de 30 minutes. Cela garantit que les statistiques de durée de visite sont précises.

## Endpoint API

Un endpoint admin a été créé pour fermer les visites inactives :

```
POST /api/v1/monitoring/close-inactive-visits?inactivity_minutes=30
```

**Paramètres :**
- `inactivity_minutes` (optionnel, défaut: 30) : Nombre de minutes d'inactivité avant de fermer une visite

**Authentification :** Requiert un token d'admin

**Réponse :**
```json
{
  "message": "Closed 5 inactive page visits",
  "closed_count": 5,
  "inactivity_minutes": 30
}
```

## Configuration du Cron Job

### Option 1 : Cron Job sur le serveur (recommandé)

Créez un fichier cron qui appelle l'endpoint toutes les 15 minutes :

```bash
# Éditer le crontab
crontab -e

# Ajouter cette ligne (exécute toutes les 15 minutes)
*/15 * * * * curl -X POST "http://localhost:8000/api/v1/monitoring/close-inactive-visits?inactivity_minutes=30" -H "Authorization: Bearer YOUR_ADMIN_TOKEN" || true
```

**Note :** Remplacez `YOUR_ADMIN_TOKEN` par un token d'authentification admin valide.

### Option 2 : Google Cloud Scheduler (pour Cloud Run)

Si vous déployez sur Google Cloud Run, utilisez Cloud Scheduler :

1. Créez un Cloud Scheduler job :
```bash
gcloud scheduler jobs create http close-inactive-visits \
  --schedule="*/15 * * * *" \
  --uri="https://YOUR-BACKEND-URL/api/v1/monitoring/close-inactive-visits?inactivity_minutes=30" \
  --http-method=POST \
  --headers="Authorization=Bearer YOUR_ADMIN_TOKEN" \
  --time-zone="UTC"
```

2. Pour tester le job :
```bash
gcloud scheduler jobs run close-inactive-visits
```

### Option 3 : Script Python avec APScheduler (pour développement local)

Créez un script séparé qui s'exécute en parallèle :

```python
# scripts/close_inactive_visits.py
import requests
import time
from apscheduler.schedulers.blocking import BlockingScheduler

API_URL = "http://localhost:8000"
ADMIN_TOKEN = "YOUR_ADMIN_TOKEN"  # À obtenir depuis votre backend

def close_inactive_visits():
    try:
        response = requests.post(
            f"{API_URL}/api/v1/monitoring/close-inactive-visits",
            params={"inactivity_minutes": 30},
            headers={"Authorization": f"Bearer {ADMIN_TOKEN}"}
        )
        if response.status_code == 200:
            data = response.json()
            print(f"Closed {data['closed_count']} inactive visits")
        else:
            print(f"Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error closing inactive visits: {e}")

if __name__ == "__main__":
    scheduler = BlockingScheduler()
    scheduler.add_job(close_inactive_visits, 'interval', minutes=15)
    print("Starting scheduler to close inactive visits every 15 minutes...")
    scheduler.start()
```

Installez APScheduler :
```bash
pip install apscheduler requests
```

Exécutez le script :
```bash
python scripts/close_inactive_visits.py
```

## Fonctionnement

1. **Fermeture automatique lors de la navigation** : Quand un utilisateur navigue vers une autre page, la visite précédente est automatiquement fermée par le hook `usePageTracking` dans le frontend.

2. **Fermeture automatique après inactivité** : Le cron job ferme toutes les visites qui :
   - N'ont pas de `end_time` (visites actives)
   - Ont commencé il y a plus de 30 minutes (ou la durée spécifiée)
   - Sont donc considérées comme inactives

3. **Calcul de la durée** : Quand une visite est fermée, la durée est calculée comme `end_time - start_time` et stockée dans `duration_seconds`.

## Recommandations

- **Fréquence** : Exécutez le cron job toutes les 15 minutes pour un bon équilibre entre précision et charge serveur
- **Durée d'inactivité** : 30 minutes est une valeur raisonnable, mais vous pouvez l'ajuster selon vos besoins
- **Monitoring** : Surveillez les logs pour vérifier que le cron job fonctionne correctement

## Dépannage

Si les visites ne sont pas fermées :
1. Vérifiez que le cron job s'exécute correctement
2. Vérifiez que le token d'authentification admin est valide
3. Vérifiez les logs du backend pour voir les erreurs éventuelles
4. Vérifiez que l'endpoint est accessible depuis l'endroit où le cron job s'exécute

