# Tracking des Canaux d'Acquisition

## Vue d'ensemble

Le système de tracking des canaux d'acquisition utilise les paramètres UTM standards et un paramètre personnalisé `channel` pour identifier la source du trafic.

## Paramètres UTM Standards

Les paramètres UTM (Urchin Tracking Module) sont des paramètres d'URL standardisés utilisés pour tracker l'origine du trafic :

### Paramètres disponibles

- `utm_source` : La source du trafic (ex: `google`, `facebook`, `newsletter`, `qr_code`)
- `utm_medium` : Le medium du trafic (ex: `cpc`, `email`, `social`, `organic`, `qr`)
- `utm_campaign` : Le nom de la campagne (ex: `summer_sale`, `product_launch`)
- `utm_term` : Le terme de recherche (pour les campagnes payantes, ex: `hotel_paris`)
- `utm_content` : Le contenu spécifique (pour A/B testing, ex: `button_red`)

### Paramètre personnalisé

- `channel` : Canal d'acquisition personnalisé (ex: `qr_code`, `flyer`, `poster`)

## Exemples d'URLs

### 1. Réseaux sociaux
```
https://votre-site.com/?utm_source=facebook&utm_medium=social&utm_campaign=summer_promo
https://votre-site.com/?utm_source=instagram&utm_medium=social&utm_campaign=influencer_post
```

### 2. Recherche Google (organique)
```
https://votre-site.com/?utm_source=google&utm_medium=organic
```

### 3. Publicité Google Ads
```
https://votre-site.com/?utm_source=google&utm_medium=cpc&utm_campaign=hotel_search&utm_term=hotel_paris
```

### 4. Email marketing
```
https://votre-site.com/?utm_source=newsletter&utm_medium=email&utm_campaign=monthly_update
```

### 5. QR Code
```
https://votre-site.com/?channel=qr_code&utm_source=poster&utm_medium=qr
```

### 6. Flyer / Affiche
```
https://votre-site.com/?channel=flyer&utm_source=print&utm_medium=flyer&utm_campaign=city_tour
```

### 7. Partenaires / Référents
```
https://votre-site.com/?utm_source=partner_site&utm_medium=referral&utm_campaign=partnership_2024
```

## Comment ça fonctionne

### 1. Détection automatique

Le système détecte automatiquement les paramètres UTM dans l'URL lors de la première visite :

- Les paramètres sont extraits de l'URL
- Ils sont stockés dans `sessionStorage` pour persister pendant toute la session
- Ils sont envoyés avec chaque visite de page dans les métadonnées

### 2. Priorité de détection

Le système utilise la priorité suivante pour déterminer le canal :

1. **Paramètre `channel`** (priorité la plus haute)
   - Ex: `?channel=qr_code` → canal = `qr_code`

2. **Paramètres UTM combinés**
   - Ex: `?utm_source=google&utm_medium=cpc` → canal = `google_cpc`

3. **Paramètre `utm_source` seul**
   - Ex: `?utm_source=facebook` → canal = `facebook`

4. **Détection automatique depuis le referrer**
   - Google → `organic_search`
   - Réseaux sociaux → `social`
   - Autres sites → `referral`
   - Pas de referrer → `direct`

### 3. Persistance

Les paramètres UTM sont stockés dans `sessionStorage` et persistent :
- Pendant toute la session du navigateur
- À travers toutes les pages visitées
- Jusqu'à la fermeture du navigateur

## Utilisation dans le Dashboard

Les canaux d'acquisition sont visibles dans le dashboard admin :

**Chemin :** `/admin/monitoring` → Onglet "Analytics" → Sous-onglet "Acquisition"

Vous verrez :
- Une répartition des canaux avec leurs comptes
- Des graphiques en camembert et en barres
- Les statistiques par canal

## Recommandations

### Pour les campagnes marketing

1. **Utilisez toujours `utm_source` et `utm_medium`** pour une meilleure granularité
2. **Ajoutez `utm_campaign`** pour suivre des campagnes spécifiques
3. **Utilisez `utm_term`** pour les campagnes de recherche payantes
4. **Utilisez `utm_content`** pour tester différentes variantes

### Pour les QR codes et supports physiques

Utilisez le paramètre `channel` pour une identification rapide :
```
https://votre-site.com/?channel=qr_code
https://votre-site.com/?channel=flyer
https://votre-site.com/?channel=poster
```

### Exemples de campagnes complètes

**Campagne Facebook Ads :**
```
https://votre-site.com/?utm_source=facebook&utm_medium=cpc&utm_campaign=summer_sale&utm_content=ad_variant_a
```

**QR Code sur un flyer :**
```
https://votre-site.com/?channel=qr_code&utm_source=flyer&utm_medium=qr&utm_campaign=city_tour_2024
```

**Email newsletter :**
```
https://votre-site.com/?utm_source=newsletter&utm_medium=email&utm_campaign=weekly_update&utm_content=cta_button
```

## Vérification

Pour vérifier que le tracking fonctionne :

1. Visitez votre site avec des paramètres UTM dans l'URL
2. Allez dans le dashboard admin → Monitoring → Analytics → Acquisition
3. Vérifiez que votre canal apparaît dans la liste

## Notes techniques

- Les paramètres UTM sont sensibles à la casse
- Les espaces dans les valeurs doivent être remplacés par des underscores (`_`) ou des tirets (`-`)
- Les paramètres sont conservés dans `sessionStorage` pour toute la session
- Le premier canal détecté lors de la session est utilisé pour toutes les visites suivantes

