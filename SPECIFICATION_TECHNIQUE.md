# Specification technique - EduStream LMS

## 1. Objet du document

Ce document decrit la specification technique de la plateforme **EduStream LMS** a partir de l'etat actuel du depot. Il sert de reference pour :

- comprendre l'architecture generale du systeme ;
- identifier les composants logiciels et leurs responsabilites ;
- documenter les choix techniques retenus ;
- decrire les flux d'echange entre le web, le mobile et le backend ;
- cadrer les exigences non fonctionnelles, les dependances et les contraintes de deploiement.

Le projet vise la mise en place d'une plateforme EdTech complete integrant :

- gestion des utilisateurs multi-roles ;
- catalogue de cours et parcours d'apprentissage ;
- suivi pedagogique, quiz, devoirs et certificats ;
- sessions live et communication temps reel ;
- messagerie et espace communautaire ;
- monetisation par abonnements et achat de cours ;
- assistance pedagogique par intelligence artificielle.

## 2. Perimetre technique

Le depot contient principalement trois ensembles :

### 2.1 Backend principal

- **Chemin :** `edustream/backend`
- **Role :** API REST, logique metier, persistance des donnees, authentification, WebSockets, administration.

### 2.2 Frontend web

- **Chemin :** `edustream`
- **Role :** interface web principale pour les etudiants, instructeurs et administrateurs.

### 2.3 Application mobile

- **Chemin :** `edustreamApp`
- **Role :** client mobile Expo/React Native consommant les memes APIs et services temps reel.

Un petit projet Java/Gradle est present a la racine du depot, mais il ne fait pas partie de l'architecture fonctionnelle d'EduStream.

## 3. Vue d'ensemble de l'architecture

L'architecture suit un modele **clients multiples + backend centralise** :

1. le frontend web consomme les endpoints REST exposes par Django REST Framework ;
2. l'application mobile consomme la meme API via une couche de services Axios ;
3. le backend gere les flux synchrones et asynchrones ;
4. les interactions temps reel passent par Django Channels et WebSocket ;
5. les integrations externes couvrent principalement Stripe pour les paiements et Gemini/OpenRouter pour l'IA.

### 3.1 Schema logique

```text
[Navigateur Web] --------\
                          \
                           > [API Django REST + Services metier] ---> [Base de donnees]
                          /                |
[Application Mobile] ----/                 +--> [Stripe]
                                           |
                                           +--> [Gemini / OpenRouter]
                                           |
                                           +--> [Redis / Cache / Channels]
                                           |
                                           +--> [Media Storage local]
```

### 3.2 Style architectural

- **Backend :** architecture modulaire par domaines Django apps
- **Web :** SPA React basee sur routing client
- **Mobile :** navigation Expo Router
- **Temps reel :** WebSocket via ASGI/Channels
- **Authentification :** JWT access + refresh
- **Communication inter-couches :** JSON over HTTP et WebSocket

## 4. Stack technique

## 4.1 Backend

- **Langage :** Python 3.10+
- **Framework :** Django 5
- **API :** Django REST Framework
- **Authentification :** `djangorestframework-simplejwt`
- **Temps reel :** Django Channels
- **Cache / broker :** Redis avec fallback memoire locale
- **Documentation API :** drf-spectacular si installe
- **Base de donnees :** SQLite en local, PostgreSQL prevu en environnement cible
- **Paiement :** Stripe
- **IA :** Gemini et OpenRouter

## 4.2 Frontend web

- **Framework UI :** React 19
- **Build tool :** Vite
- **Langage :** TypeScript
- **Routing :** React Router
- **Style :** Tailwind CSS 4
- **Composants UI :** PrimeReact, PrimeIcons
- **Visualisation :** Recharts
- **Contenu riche :** Quill, React Markdown, PDF tools
- **HTTP client :** Axios

## 4.3 Application mobile

- **Framework :** Expo 54
- **Base UI :** React Native 0.81
- **Navigation :** Expo Router
- **Stockage securise :** Expo Secure Store
- **Notifications :** Expo Notifications
- **Temps reel / media :** react-native-webrtc, WebView, expo-video
- **Reseau :** Axios, NetInfo
- **Internationalisation :** i18next

## 5. Architecture backend

## 5.1 Organisation

Le backend est structure en applications Django metier :

- `apps.users` : authentification, comptes, profils, roles, preferences ;
- `apps.courses` : catalogue, categories, cours, modules, lecons, contenus ;
- `apps.learning` : progression, quiz, assignments, submissions, notifications ;
- `apps.billing` : plans, abonnements, transactions, checkout, revenus ;
- `apps.ai_tutor` : conversation IA, messages, endpoints d'assistance ;
- `apps.live` : sessions live, participants, chat live, droits d'entree ;
- `apps.community` : discussions, commentaires, groupes d'etude ;
- `apps.messaging` : conversations et messages directs ;
- `apps.admin_dashboard` : vues ou API d'administration.

## 5.2 Points d'entree

- `manage.py` : point d'entree d'administration et d'execution Django
- `config/urls.py` : routage HTTP global
- `config/asgi.py` : routage ASGI HTTP + WebSocket
- `config/settings.py` : configuration principale

## 5.3 Routage HTTP

Les endpoints sont exposes sous le prefixe commun :

- `/api/v1/`

Les sous-espaces principaux sont :

- `/api/v1/auth/`
- `/api/v1/billing/`
- `/api/v1/ai/`
- autres ressources metier directement sous `/api/v1/`

Des routes de documentation sont prevues si `drf_spectacular` est disponible :

- `/api/schema/`
- `/api/docs/`

## 5.4 Routage WebSocket

Le backend agrege plusieurs groupes de routes WebSocket :

- live sessions ;
- communaute ;
- messagerie ;
- tuteur IA.

L'authentification WebSocket repose sur un middleware JWT dedie, ce qui permet d'associer la session socket a l'utilisateur connecte.

## 6. Architecture frontend web

Le frontend web est une application React de type SPA. Il repose sur :

- une navigation basee sur React Router ;
- une separation entre pages, composants, contextes et services ;
- une couche `services/` pour l'appel a l'API ;
- des gardes d'acces selon les roles ;
- des interfaces distinctes pour apprenant, instructeur et administrateur.

### 6.1 Responsabilites principales

- affichage du catalogue et des details de cours ;
- tableau de bord utilisateur ;
- lecture des lecons et suivi de progression ;
- gestion des devoirs, quiz, certificats ;
- messagerie, communaute et live ;
- interfaces de monétisation ;
- tableaux de bord instructeur et administration.

### 6.2 Couche de services

Les appels reseau sont centralises dans des services dedies, ce qui facilite :

- la reutilisation des appels API ;
- la gestion du token JWT ;
- la maintenance des flux par domaine metier ;
- l'alignement avec les modules backend.

## 7. Architecture mobile

L'application mobile reprend les grands modules fonctionnels du web, avec une architecture adaptee a Expo Router.

### 7.1 Navigation

Les groupes de navigation principaux sont :

- `(onboarding)` : parcours d'accueil ;
- `(auth)` : connexion, inscription, mot de passe oublie ;
- `(tabs)` : dashboard, cours, exploration, planning, plus ;
- routes detaillees : cours, lecteur, quiz, devoirs, live, IA, messages, checkout.

### 7.2 Providers globaux

L'application mobile initialise plusieurs contextes :

- authentification ;
- theme ;
- reseau ;
- onboarding ;
- alertes ;
- notifications ;
- gestion du mode hors ligne.

### 7.3 Communication API

Le client mobile utilise Axios avec :

- URL de base configurable par variable d'environnement ;
- ajout automatique du token d'acces dans les headers ;
- tentative automatique de refresh du token en cas de `401` ;
- stockage des jetons dans `SecureStore`.

## 8. Authentification et controle d'acces

## 8.1 Mecanisme d'authentification

Le systeme s'appuie sur JWT :

- **access token** de courte duree ;
- **refresh token** de duree plus longue ;
- rotation du refresh token activee ;
- invalidation via blacklist apres rotation.

## 8.2 Roles

Le modele de securite est base sur trois roles principaux :

- `STUDENT`
- `INSTRUCTOR`
- `ADMIN`

Ces roles conditionnent :

- l'acces aux interfaces ;
- les permissions d'ecriture ;
- les actions pedagogiques ;
- les droits de monetisation et d'administration.

## 8.3 Politique API

Le backend applique par defaut :

- authentification JWT ;
- permission globale `IsAuthenticated` ;
- filtrage, recherche et tri sur les endpoints ;
- pagination standard ;
- throttling sur les routes anonymes, utilisateur, auth, inscription, verification, IA.

## 9. Modules metier

## 9.1 Utilisateurs

Fonctions principales :

- inscription et connexion ;
- gestion du profil utilisateur ;
- preferences et metadonnees ;
- gestion des roles ;
- verification email ;
- suivi de presence et de statut.

## 9.2 Cours

Fonctions principales :

- gestion des categories et tags ;
- creation des cours ;
- organisation en modules et lecons ;
- ajout de ressources ;
- publication de contenus ;
- lecture et consultation cote apprenant.

## 9.3 Learning

Fonctions principales :

- inscriptions aux cours ;
- progression dans les modules ;
- quiz et tentatives ;
- assignments et soumissions ;
- activite utilisateur ;
- notifications ;
- arbre de competences.

## 9.4 Billing

Fonctions principales :

- gestion des plans d'abonnement ;
- souscriptions utilisateur ;
- achat unitaire de cours ;
- enregistrement des transactions ;
- calcul des revenus instructeur ;
- webhook Stripe pour la synchronisation des paiements.

## 9.5 AI Tutor

Fonctions principales :

- conversation pedagogique ;
- historique de messages ;
- generation assistee de contenus ;
- controle des quotas et des acces selon le plan ;
- usage potentiel de Gemini et OpenRouter.

## 9.6 Live

Fonctions principales :

- creation et planification de sessions live ;
- gestion des participants ;
- admission ou demande d'entree ;
- chat lie a la session ;
- signalisation WebRTC via WebSocket.

## 9.7 Community

Fonctions principales :

- discussions ;
- commentaires ;
- groupes d'etude ;
- messages de groupe ;
- echanges synchrones ou quasi temps reel.

## 9.8 Messaging

Fonctions principales :

- conversations privees ;
- participants ;
- messages ;
- mise a jour temps reel.

## 10. Integrations externes

## 10.1 Stripe

Stripe est utilise pour :

- la souscription a des offres ;
- l'achat de cours ;
- la reception des evenements de paiement par webhook ;
- la logique de partage de revenus cote instructeur.

## 10.2 Gemini / OpenRouter

Les services IA sont utilises pour :

- le tuteur conversationnel ;
- la generation ou l'assistance pedagogique ;
- l'enrichissement de l'experience instructeur.

## 10.3 Redis

Redis est prevu pour :

- les channel layers de Django Channels ;
- le cache Django ;
- la stabilite des fonctions temps reel en deploiement multi-processus.

Le projet prevoit des fallbacks en memoire locale pour le developpement.

## 11. Configuration et environnement

Le backend repose fortement sur des variables d'environnement. Les principales familles de configuration sont :

- securite Django : `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS` ;
- base de donnees : `DB_ENGINE`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` ;
- paiements : `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` ;
- IA : `GEMINI_API_KEY`, `OPENROUTER_API_KEY` ;
- cache et channels : `REDIS_URL`, `DJANGO_CACHE_URL`, `USE_REDIS_CHANNELS`, `USE_REDIS_CACHE` ;
- CORS et frontend : `FRONTEND_BASE_URL`, `CORS_ALLOWED_ORIGINS` ;
- WebRTC : `WEBRTC_STUN_URLS`, `WEBRTC_TURN_URLS`, `WEBRTC_TURN_USERNAME`, `WEBRTC_TURN_CREDENTIAL` ;
- email : `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`.

## 12. Donnees et persistance

## 12.1 Base de donnees

L'application supporte deux modes principaux :

- **developpement local :** SQLite ;
- **deploiement cible :** PostgreSQL.

## 12.2 Stockage media

Les fichiers sont actuellement servis depuis :

- `backend/media/`

Cela couvre notamment :

- images de cours ;
- ressources de lecons ;
- videos ;
- devoirs soumis ;
- documents televerses.

Une evolution vers un stockage objet externe reste recommandee pour la production.

## 13. Exigences non fonctionnelles

## 13.1 Securite

Le systeme doit garantir :

- protection des endpoints par JWT ;
- separation des droits par role ;
- durcissement HTTPS en production ;
- protection CORS adaptee ;
- validation des entrees ;
- journalisation des erreurs et des evenements sensibles.

## 13.2 Performance

Le systeme doit supporter :

- pagination sur les listes ;
- cache applicatif ;
- gestion efficace des sockets ;
- timeouts reseau cote client ;
- limitations de debit via throttling.

## 13.3 Scalabilite

La plateforme doit pouvoir evoluer vers :

- base PostgreSQL dediee ;
- Redis mutualise ;
- workers ASGI multi-instances ;
- stockage media externe ;
- separation front / API sur des domaines distincts.

## 13.4 Maintenabilite

La maintenabilite repose sur :

- decoupage par domaines metier ;
- services front et mobile centralises ;
- convention de routes coherente ;
- documentation API potentielle via OpenAPI ;
- structure de depot lisible.

## 14. Observabilite et journalisation

Le backend configure des logs tournants pour :

- l'authentification ;
- les erreurs applicatives ;
- les evenements de securite.

Les journaux sont utiles pour :

- diagnostiquer les echecs de connexion ;
- suivre les erreurs serveur ;
- auditer certains comportements anormaux.

## 15. Deploiement cible

## 15.1 Composants de deploiement

Un deploiement complet implique idealement :

- un service web frontend ;
- une API Django ;
- un serveur ASGI pour WebSocket ;
- une base PostgreSQL ;
- une instance Redis ;
- un reverse proxy HTTPS ;
- un stockage persistant pour les medias.

## 15.2 Flux de deploiement recommande

1. deploiement du backend avec variables d'environnement securisees ;
2. migration de la base ;
3. activation de Redis ;
4. configuration HTTPS et domaines autorises ;
5. publication du frontend web ;
6. configuration du mobile avec l'URL de l'API ;
7. verification de Stripe, CORS, sockets et webhooks.

## 16. Risques et points d'attention

Les principaux points de vigilance sont :

- ecart possible entre la documentation historique et l'etat reel de certaines interfaces ;
- presence de secrets ou valeurs sensibles a externaliser strictement en production ;
- stockage media local non ideal pour un environnement distribue ;
- couverture de tests encore perfectible ;
- complexite de securisation des flux live, paiements et IA ;
- dependance a des services tiers pour les fonctions critiques.

## 17. Conclusion technique

EduStream repose sur une architecture full stack moderne, modulaire et evolutive. Le backend Django centralise la logique metier, la securite, la persistance et les flux temps reel, tandis que le web et le mobile consomment les memes services applicatifs. La plateforme couvre un spectre fonctionnel large pour un LMS moderne : pedagogie, communication, live, monetisation et IA.

Cette specification constitue une base technique de reference pour :

- la soutenance du projet ;
- la poursuite du developpement ;
- la preparation d'un dossier de deploiement ;
- la redaction du rapport academique ;
- l'industrialisation progressive de la solution.
