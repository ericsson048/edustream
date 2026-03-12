# Guide de Développement Backend - EduStream LMS (Édition Django + WebRTC + Business Model)

Ce document définit l'architecture, le modèle de données et les routes API nécessaires pour construire le backend complet de la plateforme d'apprentissage (LMS) en utilisant **Python et Django**. Il inclut le **WebRTC** (Classes en direct) et la **Logique de Monétisation (Business Plan)**.

## 1. Stack Technique Recommandée & Avancée

*   **Langage :** Python 3.10+
*   **Framework Web :** Django 5.x + Django REST Framework (DRF)
*   **Temps Réel & WebSockets :** Django Channels + Redis (Daphne/Uvicorn)
*   **Base de données :** PostgreSQL
*   **Authentification :** JWT via `djangorestframework-simplejwt`
*   **Paiements & Abonnements :** Stripe (Stripe Connect pour le split des revenus, Stripe Billing pour les abonnements)
*   **Stockage Fichiers :** `django-storages` (AWS S3, GCS)

---

## 2. Modèle de Données Exhaustif (Django Models)

### 👤 Utilisateurs & Profils
**`User` (Custom User Model)**
*   `id` (UUIDField, primary_key=True)
*   `email` (EmailField, unique=True)
*   `role` (CharField, choices: STUDENT, INSTRUCTOR, ADMIN)
*   `stripe_account_id` (CharField, null=True) - *Pour payer l'instructeur via Stripe Connect*
*   `stripe_customer_id` (CharField, null=True) - *Pour facturer l'étudiant*

### 💰 Business Model : Abonnements (SaaS)
*Pour gérer l'accès illimité à l'IA et aux Live Streams.*

**`SubscriptionPlan` (Les offres)**
*   `id` (UUIDField, primary_key=True)
*   `name` (CharField) - *Ex: "Free", "Pro", "Unlimited"*
*   `price_monthly` (DecimalField)
*   `stripe_price_id` (CharField)
*   `has_unlimited_ai` (BooleanField, default=False)
*   `has_unlimited_streams` (BooleanField, default=False)
*   `ai_monthly_limit` (IntegerField, default=20) - *Si pas illimité*

**`UserSubscription` (L'abonnement actif de l'utilisateur)**
*   `user` (OneToOneField -> User)
*   `plan` (ForeignKey -> SubscriptionPlan)
*   `status` (CharField, choices: ACTIVE, CANCELED, PAST_DUE)
*   `current_period_end` (DateTimeField)
*   `ai_prompts_used_this_month` (IntegerField, default=0)

### 🛒 Business Model : Vente de Cours (Marketplace)
*Pour gérer le pourcentage (%) pris par la plateforme sur chaque vente.*

**`Course` (Cours)**
*   `id` (UUIDField, primary_key=True)
*   `title` (CharField)
*   `instructor` (ForeignKey -> User)
*   `price` (DecimalField)
*   `platform_fee_percentage` (DecimalField, default=30.00) - *La plateforme prend 30%, l'instructeur 70%*

**`Transaction` (Historique des achats)**
*   `id` (UUIDField, primary_key=True)
*   `student` (ForeignKey -> User)
*   `course` (ForeignKey -> Course)
*   `amount_paid` (DecimalField) - *Ce que l'étudiant a payé*
*   `platform_fee` (DecimalField) - *Ce que la plateforme garde*
*   `instructor_earning` (DecimalField) - *Ce qui est reversé à l'instructeur*
*   `stripe_payment_intent_id` (CharField)
*   `created_at` (DateTimeField, auto_now_add=True)

### 📖 Structure du Cours (VOD) & 🔴 Classes en Direct (WebRTC)
**`Module`**, **`Lesson`**, **`LiveSession`**, **`LiveParticipant`** (Identiques à la version précédente).

### 🛠️ Fonctionnalités des Onglets & Progression
**`Resource`**, **`Note`**, **`Discussion`**, **`Enrollment`**, **`Progress`**, **`Notification`** (Identiques à la version précédente).

---

## 3. Architecture des Routes API (Endpoints REST DRF)

Toutes les routes HTTP classiques doivent être préfixées par `/api/v1/`.

### 💳 Paiements & Monétisation (`/billing/`)
| Méthode | Route | Description |
| :--- | :--- | :--- |
| GET | `/billing/plans/` | Lister les abonnements disponibles (Free, Pro, Unlimited) |
| POST | `/billing/subscribe/` | Créer une session Stripe Checkout pour un abonnement |
| POST | `/billing/checkout/<course_id>/` | Acheter un cours à l'unité (Split paiement) |
| POST | `/billing/webhook/` | **CRUCIAL :** Écouter les événements Stripe (Paiement réussi, Abonnement renouvelé) |
| GET | `/instructor/earnings/` | Tableau de bord des revenus de l'instructeur |

### 🤖 Tuteur IA (`/ai/`)
| Méthode | Route | Description |
| :--- | :--- | :--- |
| POST | `/ai/tutor/chat/` | Vérifie d'abord `UserSubscription`. Si quota dépassé -> Erreur 403 "Upgrade to Unlimited". Sinon -> Appel Gemini. |

### 🔴 Live Sessions (`/live-sessions/`)
| Méthode | Route | Description |
| :--- | :--- | :--- |
| POST | `/live-sessions/` | Vérifie si l'instructeur a le plan "Unlimited" ou s'il lui reste des crédits avant de créer la salle WebRTC. |

*(Les autres routes Auth, Courses, Lessons, Notes restent identiques).*

---

## 4. Architecture Temps Réel & WebRTC (WebSockets)

*(Voir version précédente pour le détail des événements JSON `join_room`, `webrtc_offer`, etc.)*

**Contrôle d'accès au WebSocket :**
Dans votre `Consumer` Django Channels, lors de la connexion (`connect`), vous devez vérifier :
1. L'étudiant a-t-il acheté le cours ? (Vérification de l'`Enrollment`).
2. L'instructeur a-t-il un abonnement actif permettant de streamer ? (Vérification de `UserSubscription`).
Si non, la connexion WebSocket est rejetée (`self.close()`).

---

## 5. Logique Métier : Le Business Plan (Comment ça marche ?)

### A. Le Split des Revenus (Marketplace de Cours)
Pour gérer le fait que la plateforme prend un pourcentage (ex: 30%) sur les ventes de cours :
1.  **Stripe Connect :** C'est la solution standard. Lors de l'inscription d'un instructeur, il doit lier son compte bancaire via Stripe Connect (génère un `stripe_account_id`).
2.  **Le Paiement :** Quand un étudiant achète un cours à 100€, vous créez un *PaymentIntent* Stripe en spécifiant un `application_fee_amount` de 30€.
3.  **Le Résultat :** Stripe s'occupe de tout. 100€ sont débités à l'étudiant. 30€ vont sur le compte de votre plateforme. 70€ vont directement sur le compte Stripe de l'instructeur. Vous enregistrez cela dans le modèle `Transaction`.

### B. L'Abonnement "Unlimited" (IA & Live Streams)
Pour limiter l'accès à l'IA et au WebRTC et inciter à l'abonnement :
1.  **Utilisateur Gratuit/Standard :** Dans le modèle `UserSubscription`, il a une limite (ex: 20 questions IA par mois). À chaque appel à `/ai/tutor/chat/`, vous incrémentez `ai_prompts_used_this_month`. Si la limite est atteinte, l'API renvoie une erreur `402 Payment Required`.
2.  **Utilisateur Premium (Unlimited) :** Il paie un abonnement mensuel via Stripe Billing. Son `UserSubscription` a `has_unlimited_ai = True`. Le compteur n'est plus vérifié.
3.  **Webhook Stripe :** C'est la route `/billing/webhook/` qui écoute Stripe en arrière-plan. Si le paiement mensuel de l'étudiant échoue, le webhook met à jour le `status` de l'abonnement à `PAST_DUE` et l'accès illimité est coupé automatiquement.

---

## 6. Plan d'Action pour le Développement

1.  **Initialisation & Auth :** Setup Django, Custom User, SimpleJWT.
2.  **Modèles Core & REST API :** Course, Lesson, Enrollment, Progress.
3.  **Intégration Stripe (Le cœur du Business) :**
    *   Installer la librairie `stripe` en Python.
    *   Créer les modèles `SubscriptionPlan`, `UserSubscription`, `Transaction`.
    *   Implémenter la route `/billing/webhook/` (Très important pour synchroniser votre BDD avec Stripe).
4.  **Limites & Quotas (IA / Live) :**
    *   Créer des *Custom Permissions* DRF (ex: `class HasAIAccess(BasePermission):`) pour bloquer les requêtes si le quota est dépassé.
5.  **Serveur de Signalisation WebRTC :** Configuration de Django Channels et Redis pour les lives.
6.  **Intégration Frontend :** Connecter React aux WebSockets et aux pages de paiement Stripe Checkout.
