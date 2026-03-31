# Plan d'integration Redis pour EduStream

## Objectif

Integrer Redis dans le projet pour:

- fiabiliser le temps reel avec Django Channels
- accelerer certaines lectures frequentes
- introduire des mecanismes de presence, quotas et anti-spam
- preparer une base propre pour des taches asynchrones plus tard

## Contexte actuel

Le projet contient deja:

- plusieurs WebSockets avec `channels`
- la dependance `channels-redis`
- une variable `REDIS_URL` dans l'exemple d'environnement

La configuration actuelle utilise encore `InMemoryChannelLayer` par defaut dans `backend/config/settings.py`. Cela fonctionne en local, mais devient limite des qu'on a plusieurs processus ou plusieurs instances backend.

## Priorites

### Phase 1: Redis pour Django Channels

But: rendre fiables les messages temps reel pour:

- messagerie
- communaute
- groupes d'etude
- sessions live
- tuteur IA en WebSocket

Actions:

1. Configurer Redis comme channel layer par defaut.
2. Conserver `REDIS_URL` comme point d'entree unique de configuration.
3. Verifier les connexions WebSocket pour:
   - envoi de message
   - diffusion de groupe
   - connexion/deconnexion
   - comportement multi-utilisateur
4. Tester avec plusieurs sessions navigateur.

Resultat attendu:

- les messages sont partages entre tous les workers backend
- le temps reel reste fonctionnel en production multi-instance

### Phase 2: Cache applicatif

But: reduire la charge base de donnees sur les lectures frequentes.

Cibles prioritaires:

- liste des categories
- catalogue des cours publies
- dashboards avec agregations simples
- compteurs ou vues de conversations recentes

Actions:

1. Ajouter une configuration `CACHES` Django basee sur Redis.
2. Mettre en cache les endpoints les plus consultes avec un TTL court.
3. Invalider le cache lors des creations ou mises a jour critiques.
4. Mesurer le gain avant d'etendre le cache a d'autres vues.

Resultat attendu:

- reponses plus rapides
- moins de requetes repetitives sur la base

### Phase 3: Presence, quotas et anti-spam

But: utiliser Redis comme stockage ephemere rapide.

Cas d'usage:

- statut utilisateur en ligne/hors ligne
- nombre de connexions par salle live
- limitation des messages envoyes par minute
- limitation des appels au tuteur IA ou a la generation de contenu

Actions:

1. Definir des cles Redis avec TTL pour la presence.
2. Ajouter des compteurs par utilisateur et par fenetre de temps.
3. Bloquer ou ralentir les usages abusifs.
4. Journaliser les refus pour faciliter le suivi.

Resultat attendu:

- meilleure stabilite
- meilleure maitrise des couts IA
- reduction du spam

### Phase 4: Taches asynchrones

But: preparer la suite si le projet grandit.

Cas d'usage potentiels:

- envoi d'emails
- notifications
- generation de certificats
- traitements longs lies a l'IA
- traitements media

Actions:

1. Evaluer Celery ou une alternative compatible avec Redis.
2. Identifier les operations lentes a sortir du cycle HTTP.
3. Ajouter un worker separe si necessaire.

Resultat attendu:

- API plus reactive
- meilleure separation des traitements longs

## Modifications techniques prevues

### Backend

Fichiers probablement concernes:

- `backend/config/settings.py`
- `backend/.env.example`
- eventuellement des vues ou services pour le cache
- eventuellement des consumers pour la presence et les quotas

Ajouts prevus:

- `CHANNEL_LAYERS` base sur Redis
- `CACHES` base sur Redis
- variables d'environnement associees

### Infrastructure

Elements a prevoir:

- un conteneur ou service Redis
- une URL de connexion par environnement
- une verification de disponibilite au demarrage ou en monitoring

## Variables d'environnement proposees

- `REDIS_URL=redis://127.0.0.1:6379/0`
- `DJANGO_CACHE_URL=redis://127.0.0.1:6379/1`
- `CHANNEL_BACKEND=channels_redis.core.RedisChannelLayer`

Note:

- la separation par base logique Redis peut aider a distinguer channels et cache
- en production, il faudra proteger l'acces Redis par reseau prive et authentification si disponible

## Strategie de deploiement

1. Activer Redis en environnement local.
2. Basculer d'abord uniquement les channel layers.
3. Valider les WebSockets en test manuel.
4. Ajouter ensuite le cache sur un petit nombre d'endpoints.
5. Mesurer avant/apres.
6. Activer presence et quotas dans un second temps.

## Tests a prevoir

### Tests fonctionnels

- deux utilisateurs dans une meme conversation
- diffusion sur groupe d'etude
- entree/sortie dans une session live
- emission d'evenements communautaires

### Tests de robustesse

- redemarrage d'un worker backend
- plusieurs connexions simultanees
- verification que les messages restent diffuses correctement

### Tests cache

- lecture d'une meme ressource plusieurs fois
- invalidation apres modification
- absence de donnees stale sur les ecrans critiques

## Risques et points d'attention

- ne pas utiliser Redis comme source de verite metier
- bien distinguer donnees ephemeres et donnees persistantes
- eviter de mettre en cache des donnees sensibles sans controle
- prevoir des TTL raisonnables
- surveiller la taille memoire de Redis

## Recommandation pratique

Ordre conseille pour EduStream:

1. Redis pour `channels`
2. Redis pour le cache des lectures frequentes
3. Redis pour presence et rate limiting
4. Redis pour file de taches si la charge augmente

## Critere de succes

L'integration sera consideree reussie si:

- les WebSockets fonctionnent correctement sur plusieurs workers
- les ecrans les plus consultes repondent plus vite
- les abus sur chat et IA sont limites
- l'architecture reste simple a maintenir

