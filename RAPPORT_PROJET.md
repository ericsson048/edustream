# RAPPORT DE PROJET

## Page de garde

**Nom de l'université :** **Université du Burundi**.  
**Faculté et département :** non précisés dans les informations disponibles pour cette version du rapport.  
**Intitulé du cours :** **Application Web**.  
**Titre du travail / projet :** **EduStream LMS - Plateforme d'apprentissage en ligne avec tuteur IA, cours en direct et monétisation**.  
**Membres du groupe :** **Ericsson Ishaka**, **Nigaba Fabien** et **Hasiyo Arsene**.  
**Nom et prénom de l'enseignant :** **Ciza Innocent**.  
**Année académique :** 2025-2026.  
**Date de soumission :** 31 mars 2026.



## Remerciements

Dans le cadre de ce projet, nous adressons nos sincères remerciements à l'**Université du Burundi** pour le cadre académique et scientifique mis à la disposition des étudiants. Nous remercions tout particulièrement le titulaire du cours **Application Web**, **Monsieur Ciza Innocent**, pour son accompagnement, ses conseils, ses orientations pédagogiques et l'encadrement accordé tout au long de la réalisation de ce travail. Nous exprimons également notre reconnaissance envers les auteurs des bibliothèques, frameworks et outils open source mobilisés pour le développement de cette plateforme. Enfin, nous saluons l'implication collective des membres du groupe, dont la complémentarité a permis de concevoir une application complète intégrant front-end, backend, paiements, intelligence artificielle et communication en temps réel.



## Résumé

EduStream est une plateforme de gestion de l'apprentissage conçue pour offrir un environnement pédagogique moderne intégrant cours en ligne, suivi de progression, messagerie, communauté, sessions live et assistance par intelligence artificielle. Le projet repose sur une architecture full stack associant React et Vite pour l'interface, ainsi que Django, Django REST Framework et Channels pour les services backend et temps réel. La solution développée permet de gérer plusieurs rôles utilisateurs, la création et la diffusion de contenus pédagogiques, les paiements et les interactions synchrones. Les résultats montrent la mise en place d'un LMS cohérent, extensible et adapté aux usages actuels du e-learning.



## Table des matières

1. Page de garde  
2. Remerciements  
3. Résumé  
4. Table des matières  
5. Liste des figures et des tableaux  
6. Introduction  
7. Développement du projet  
8. Conclusion  
9. Références  
10. Annexes



## Liste des figures et des tableaux

Dans l'état actuel du dépôt, aucune figure numérotée ni aucun tableau académique formel ne sont intégrés dans le rapport. Toutefois, le projet contient plusieurs éléments visuels qui peuvent être exploités comme illustrations dans une version finale, notamment la page d'accueil, la page de tarification, les tableaux de bord étudiant, instructeur et administrateur, l'interface du chatbot IA, les espaces communautaires, les vues de gestion de cours et les écrans de sessions en direct.

Les captures d'écran recommandées pour le rapport sont les suivantes : **Capture 1 - Page d'accueil EduStream**, **Capture 2 - Page de tarification**, **Capture 3 - Tableau de bord apprenant**, **Capture 4 - Catalogue des cours**, **Capture 5 - Détails d'un cours**, **Capture 6 - Lecteur de cours**, **Capture 7 - Interface du tuteur IA**, **Capture 8 - Espace communauté**, **Capture 9 - Messagerie**, **Capture 10 - Tableau de bord instructeur**, **Capture 11 - Assistant de création de cours**, **Capture 12 - Gestion des sessions live**, **Capture 13 - Tableau de bord administrateur** et **Capture 14 - Gestion des transactions ou des utilisateurs**.



## Introduction

Le développement des environnements numériques d'apprentissage constitue aujourd'hui un enjeu majeur dans l'enseignement supérieur, la formation professionnelle et l'autoformation. Les utilisateurs attendent désormais des plateformes capables de centraliser les contenus, de faciliter l'interaction entre apprenants et enseignants, d'automatiser certaines tâches pédagogiques et d'offrir une expérience personnalisée. C'est dans ce contexte qu'a été conçu le projet **EduStream LMS**, une plateforme d'apprentissage en ligne pensée comme un système moderne, interactif et évolutif.

La problématique à laquelle répond ce projet peut être formulée de la manière suivante : comment concevoir une plateforme éducative capable de regrouper la gestion des cours, la progression des apprenants, la communication, les classes en direct, les paiements et l'assistance intelligente dans une seule application cohérente ? Cette problématique est importante, car de nombreuses solutions existantes répondent seulement à une partie du besoin, alors que les usages actuels exigent une intégration complète des services pédagogiques, communautaires et économiques.

L'objectif général du projet est donc de développer une plateforme LMS complète permettant à différents types d'utilisateurs d'interagir autour de contenus d'apprentissage. Plus précisément, le projet vise à mettre en place une authentification multi-rôles, une gestion de catalogue de cours, un lecteur pédagogique, des devoirs et quiz, un système de discussion et de messagerie, des sessions live, un tuteur IA ainsi qu'un modèle de monétisation fondé sur les abonnements et la vente de cours. Le travail entrepris poursuit aussi un objectif méthodologique, à savoir l'expérimentation d'une architecture full stack moderne combinant interface web, API REST, WebSockets, stockage de données et services d'IA.

La démarche générale adoptée repose sur une séparation claire entre front-end et backend. L'interface utilisateur est réalisée avec React, TypeScript et Vite, tandis que les services métiers sont fournis par un backend Django structuré en applications spécialisées. Les échanges entre les deux couches s'effectuent à travers des API REST et des canaux WebSocket pour les fonctionnalités temps réel. Le présent rapport expose successivement la présentation générale du projet, son déroulement, les résultats obtenus, une discussion critique sur la solution développée, quelques recommandations, puis une conclusion récapitulative.

**Capture à insérer :** *Capture 1 - Page d'accueil EduStream*.



## Développement du projet

### a. Présentation du projet

EduStream est une plateforme de type **Learning Management System** orientée vers la diffusion de cours en ligne, l'encadrement pédagogique et la monétisation de contenus éducatifs. Le thème choisi porte donc sur la transformation numérique de l'apprentissage à travers un environnement unique réunissant apprentissage asynchrone, accompagnement intelligent et interaction communautaire. Le projet ne se limite pas à une simple vitrine de cours. Il met en œuvre une logique complète de gestion d'utilisateurs, d'inscription à des cours, de progression, d'évaluation, de communication, de planification de sessions live et de gestion financière.

Les objectifs visés par cette solution sont multiples. D'un côté, la plateforme doit offrir à l'étudiant un espace de formation personnalisé comprenant un tableau de bord, un accès aux cours inscrits, un suivi des leçons, des devoirs, des quiz, des notes, des certificats, des espaces d'échange et des sessions en direct. D'un autre côté, elle doit permettre à l'instructeur de créer et publier des cours, de structurer les contenus en modules et leçons, de gérer les ressources pédagogiques, de suivre les apprenants, d'analyser les performances et d'organiser des classes live. Enfin, le système doit fournir à l'administrateur des outils de supervision globale portant sur les utilisateurs, les cours, les transactions, les rapports, les paramètres et le support.

Dans l'organisation de la plateforme, trois rôles utilisateurs principaux sont clairement définis. Le **tuteur** ou instructeur est responsable de la conception pédagogique, de la création des cours, de la structuration en modules et leçons, de la mise en place des évaluations ainsi que de l'animation des sessions en direct. L'**apprenant** est l'utilisateur qui consulte le catalogue, s'inscrit aux cours, suit les contenus, passe les quiz, soumet les devoirs, participe à la communauté et bénéficie de l'accompagnement offert par le tuteur IA. L'**administrateur**, quant à lui, supervise l'ensemble du système, gère les utilisateurs, contrôle les contenus, suit les transactions et veille au bon fonctionnement global de la plateforme. Cette distinction des rôles permet de mieux organiser les responsabilités fonctionnelles et de garantir une expérience adaptée à chaque profil.

Sur le plan technique, le projet mobilise un ensemble d'outils complémentaires. La partie front-end est développée avec **React 19**, **TypeScript**, **Vite**, **React Router**, **Tailwind CSS**, **PrimeReact**, **Recharts**, **Lucide React** et plusieurs bibliothèques utilitaires destinées à l'interface, aux animations et à la gestion de données. La partie backend repose sur **Python**, **Django**, **Django REST Framework**, **Simple JWT** pour l'authentification, **Django Channels** pour le temps réel, ainsi qu'une base de données SQLite en environnement local avec possibilité d'utilisation de PostgreSQL. Le projet intègre également **Stripe** pour les paiements et **Gemini** pour les fonctionnalités liées à l'intelligence artificielle. Cette combinaison technologique permet de construire une application web moderne, modulaire et extensible.

**Captures à insérer :** *Capture 2 - Page de tarification* et *Capture 13 - Tableau de bord administrateur*.

### b. Déroulement du projet

Le déroulement du projet s'est structuré autour de plusieurs étapes cohérentes. Une première étape a consisté à définir le besoin fonctionnel et l'orientation générale du produit. Cette phase de cadrage a permis d'identifier les modules essentiels du système, notamment l'authentification, les rôles utilisateurs, les cours, les évaluations, les paiements, la communauté et l'assistant IA. Un document d'orientation backend présent dans le dépôt formalise d'ailleurs l'architecture cible, les modèles de données et les routes API à développer, ce qui montre que le projet a été pensé avant l'implémentation.

La deuxième étape a concerné la mise en place de l'architecture applicative. Le front-end a été organisé en pages, composants, contextes, services et types, tandis que le backend a été réparti en applications spécialisées telles que `users`, `courses`, `learning`, `billing`, `ai_tutor`, `live`, `community` et `messaging`. Cette structuration a permis de séparer clairement les responsabilités métier et de favoriser une meilleure maintenabilité du code. L'authentification par jetons JWT et la protection des routes selon les rôles ont ensuite été intégrées afin de garantir un accès conditionné aux différentes interfaces.

Une troisième phase a porté sur le développement progressif des fonctionnalités principales. Côté étudiant, plusieurs vues ont été conçues, dont la page d'accueil, la tarification, l'inscription, la connexion, le tableau de bord, le catalogue de cours, les détails de cours, le lecteur pédagogique, les devoirs, la remise de travaux, les notes, la communauté, la messagerie, le profil, l'arbre de compétences, la salle de concentration, l'emploi du temps et les réunions en direct. Côté instructeur, le projet comprend un tableau de bord, une vue de gestion des cours, un assistant de création de cours en plusieurs étapes, des pages d'édition de modules et de leçons, une gestion des devoirs, des analyses et un agenda des sessions live. Enfin, l'espace administrateur regroupe un tableau de bord, la gestion des utilisateurs, des cours, des transactions, des rapports, des paramètres et du support.

Une quatrième étape a consisté à relier l'interface aux services backend par l'intermédiaire de clients API dédiés. Des services front-end tels que `authService`, `courseService`, `learningService`, `billingService`, `communityService`, `messagingService`, `liveService` et `aiService` traduisent concrètement cette intégration. Le projet exploite aussi le temps réel via WebSocket pour le chatbot IA, la communauté, les groupes d'étude et les sessions live. Le dépôt contient en outre une commande de peuplement de données de démonstration (`seed_demo_data`) qui crée des comptes utilisateurs, des abonnements, des cours, des inscriptions, des quiz, des devoirs, des discussions, des messages, des sessions live et des transactions. Cela montre que le projet a également été préparé pour des scénarios de test réalistes.

La répartition des tâches au sein du groupe a été organisée de manière complémentaire. **Ericsson Ishaka** a pris en charge le **front-end**, en particulier l'interface de l'apprenant, les vues d'administration ainsi que l'espace du tuteur. Son travail a porté sur la navigation, la présentation visuelle de la plateforme et l'expérience utilisateur des différents tableaux de bord et écrans principaux. **Nigaba Fabien** s'est occupé du **backend principal**, notamment la structuration du serveur Django, les modèles métier, les API REST et la logique générale de gestion des données. **Hasiyo Arsene** a assuré l'intégration backend de **Stripe**, de **Gemini** et des mécanismes de **communication en temps réel avec Django Channels**, contribuant ainsi aux paiements, au tuteur IA et aux échanges synchrones de la plateforme. Pour les illustrations, plusieurs captures d'écran peuvent être produites à partir des interfaces déjà présentes dans le projet, notamment l'accueil, le pricing, le chatbot, le tableau de bord instructeur, la communauté et l'éditeur de cours.

**Captures à insérer :** *Capture 10 - Tableau de bord instructeur*, *Capture 11 - Assistant de création de cours* et *Capture 12 - Gestion des sessions live*.

### c. Résultats obtenus

Le principal résultat obtenu est la réalisation d'une plateforme LMS full stack fonctionnellement très riche. L'application comprend un **front-end complet** avec routage, protection d'accès et interfaces distinctes selon les rôles. La page d'accueil présente EduStream comme une solution de nouvelle génération fondée sur l'apprentissage assisté par IA, les classes WebRTC et l'intégration d'outils de pratique. Une page de tarification permet de valoriser le modèle économique de la plateforme, aussi bien pour les apprenants que pour les instructeurs. Les formulaires d'inscription, de connexion et de récupération de mot de passe montrent que le parcours d'accès utilisateur a été pris en charge dès le départ.

**Captures à insérer :** *Capture 3 - Tableau de bord apprenant* et *Capture 4 - Catalogue des cours*.

Un second résultat majeur concerne la **gestion du contenu pédagogique**. Le backend expose les routes nécessaires pour gérer les cours, modules, leçons, ressources, inscriptions, progression, quiz, devoirs, remises, notes et certificats. Le front-end permet de consulter le catalogue, d'ouvrir les détails d'un cours, de suivre les leçons dans un lecteur dédié, de passer des quiz et de consulter les résultats. Du côté instructeur, le système propose un assistant de création de cours en quatre étapes qui guide la définition du positionnement, des objectifs pédagogiques, de la structure et de la révision finale. Ce wizard est complété par des fonctions de génération IA d'un plan de cours, de modules et de leçons, ce qui constitue une valeur ajoutée notable.

**Captures à insérer :** *Capture 5 - Détails d'un cours*, *Capture 6 - Lecteur de cours* et *Capture 11 - Assistant de création de cours*.

Un troisième résultat important est l'intégration des **interactions communautaires et du temps réel**. EduStream inclut des discussions, des groupes d'étude, une messagerie entre utilisateurs et des sessions live accessibles depuis l'emploi du temps. La présence de sockets communautaires, de sockets de groupes d'étude et d'un socket pour le tuteur IA démontre une implémentation concrète de la communication temps réel. Le backend prend également en charge les sessions live via REST et WebSocket, ce qui répond à l'objectif de rapprocher l'enseignement synchrone et asynchrone au sein d'une même plateforme.

**Captures à insérer :** *Capture 7 - Interface du tuteur IA*, *Capture 8 - Espace communauté*, *Capture 9 - Messagerie* et *Capture 12 - Gestion des sessions live*.

Le projet intègre enfin un **modèle économique exploitable**. Le backend de facturation gère les plans d'abonnement, les achats de cours, les transactions, les webhooks Stripe et le calcul des revenus reversés aux instructeurs. Les données de démonstration montrent par exemple l'existence de comptes étudiants, instructeurs et administrateurs, de plusieurs plans d'abonnement, de deux cours publiés et de transactions associées. Cette intégration de la monétisation, combinée aux fonctionnalités pédagogiques et sociales, fait d'EduStream un projet abouti et non un simple prototype visuel.

**Capture à insérer :** *Capture 14 - Gestion des transactions ou des utilisateurs*.

### d. Discussion

L'analyse critique du projet met en évidence plusieurs points forts. Tout d'abord, l'architecture choisie est cohérente avec les objectifs visés. La séparation front-end/back-end, la structuration modulaire des applications Django et l'usage de services dédiés côté React offrent une bonne lisibilité du système. Ensuite, le périmètre fonctionnel est particulièrement large pour un projet académique : rôles multiples, cours, évaluations, communauté, paiements, lives et IA sont déjà présents dans le code. Le choix de technologies actuelles, telles que React, TypeScript, Django REST Framework, Channels et WebSocket, renforce également la pertinence technique du projet.

Le projet présente aussi une originalité intéressante dans l'intégration d'un **tuteur IA contextuel** et d'un **wizard de création de cours assisté par IA**. Cette orientation répond aux tendances actuelles du numérique éducatif, où l'automatisation et l'accompagnement intelligent jouent un rôle croissant. De plus, l'existence d'un business model fondé sur le partage de revenus et les abonnements montre une réflexion avancée sur la viabilité économique de la plateforme. Le fait de prévoir des quotas IA, des sessions live conditionnées par l'abonnement et des paiements via Stripe donne au projet une portée plus réaliste.

Certaines limites apparaissent néanmoins à l'analyse. Une première limite réside dans l'hétérogénéité de certains éléments de présentation ou de tarification entre les interfaces et les données de démonstration, ce qui suggère que certaines parties restent encore en cours d'harmonisation. Une deuxième limite possible concerne l'absence apparente, dans les fichiers consultés, d'une stratégie complète de tests automatisés couvrant l'ensemble du front-end et du backend. Enfin, comme tout système intégrant IA, WebSocket, paiements et médias, la solution exige une attention particulière sur la sécurité, la gestion des erreurs, la scalabilité et la robustesse de déploiement.

Globalement, ces limites n'enlèvent pas la valeur du travail réalisé. Elles montrent plutôt que le projet se situe à un stade avancé de développement fonctionnel, avec encore quelques points à consolider pour une mise en production plus rigoureuse. Dans un cadre pédagogique, le projet atteint déjà un niveau d'intégration très satisfaisant.

### e. Recommandations

Pour améliorer davantage EduStream, il serait pertinent de renforcer en priorité la documentation académique et technique du projet. Une page de garde complète, une documentation d'installation unifiée, un diagramme d'architecture, un schéma de base de données et une description claire des responsabilités par membre permettraient d'augmenter la qualité de présentation du travail et de faciliter sa soutenance. Il serait également utile d'harmoniser les textes d'interface, les plans tarifaires affichés et les données de démonstration afin de garantir une meilleure cohérence produit.

Sur le plan technique, il serait recommandé d'ajouter une couverture de tests plus systématique, notamment pour l'authentification, la facturation, les permissions par rôle, les WebSockets et les flux critiques comme l'achat d'un cours ou la création d'une session live. Une autre piste d'amélioration consisterait à approfondir la sécurisation des données, la validation des entrées, la gestion des fichiers médias et les scénarios de tolérance aux pannes. Du point de vue pédagogique, la plateforme pourrait encore évoluer par l'ajout de tableaux de bord analytiques plus avancés, de recommandations de contenus personnalisées, de badges ou d'éléments de gamification, et d'une meilleure localisation multilingue.

Pour de futurs projets similaires, il serait judicieux d'adopter dès le départ une méthode de gestion de projet explicitement documentée, avec calendrier, livrables intermédiaires, responsabilités précises et critères d'évaluation mesurables. Cette approche permettrait non seulement de mieux piloter le développement, mais aussi de rédiger plus facilement le rapport final.



## Conclusion

Le projet **EduStream LMS** a permis de concevoir une plateforme d'apprentissage numérique complète réunissant plusieurs dimensions essentielles du e-learning moderne. L'application développée associe la diffusion de contenus pédagogiques, l'évaluation des apprenants, la communication communautaire, les sessions live, l'assistance par intelligence artificielle et un mécanisme de monétisation. Le résultat obtenu témoigne d'une bonne maîtrise des architectures web full stack et d'une compréhension concrète des besoins fonctionnels d'un système éducatif numérique.

Au-delà du produit lui-même, ce projet a constitué une expérience formatrice sur les plans technique, méthodologique et collaboratif. Il a permis d'appliquer des notions liées au développement front-end, à la conception d'API, à la gestion d'authentification, au temps réel, à la structuration de données, à l'intégration de services externes et à l'organisation modulaire d'une application de grande taille. Le groupe a également pu acquérir une meilleure compréhension des enjeux liés à l'expérience utilisateur, à la scalabilité fonctionnelle, à la valeur métier d'un produit logiciel et à l'importance de documenter les choix techniques.

En somme, EduStream représente un projet ambitieux et pertinent, capable de servir de base solide à des améliorations futures ou à une mise en production plus poussée. Les acquis tirés de ce travail concernent autant la capacité à développer une solution technique cohérente que l'aptitude à penser un produit numérique dans sa globalité.



## Références

Les références de ce rapport sont constituées uniquement de sources web officielles en lien avec le contexte institutionnel et les technologies utilisées dans le projet :

- Université du Burundi, page de présentation officielle : [https://www.ub.edu.bi/?page_id=2290](https://www.ub.edu.bi/?page_id=2290)
- React Documentation : [https://react.dev/](https://react.dev/)
- React Versions : [https://react.dev/versions](https://react.dev/versions)
- Django Documentation : [https://docs.djangoproject.com/](https://docs.djangoproject.com/)
- Django REST Framework Documentation : [https://www.django-rest-framework.org/](https://www.django-rest-framework.org/)
- Django Channels Documentation : [https://channels.readthedocs.io/en/stable/](https://channels.readthedocs.io/en/stable/)
- Stripe Checkout Documentation : [https://docs.stripe.com/payments/checkout/how-checkout-works](https://docs.stripe.com/payments/checkout/how-checkout-works)
- Stripe Connect Documentation : [https://docs.stripe.com/connect/how-connect-works](https://docs.stripe.com/connect/how-connect-works)
- Google AI Gemini API Documentation : [https://ai.google.dev/gemini-api/docs](https://ai.google.dev/gemini-api/docs)



## Annexes

### A. Captures d'écran supplémentaires

Cette annexe doit contenir les captures d'écran supplémentaires du projet. Les écrans à ajouter sont les suivants : **Page d'accueil EduStream**, **Page de tarification**, **Tableau de bord apprenant**, **Catalogue des cours**, **Détails d'un cours**, **Lecteur de cours**, **Interface du tuteur IA**, **Espace communauté**, **Messagerie**, **Tableau de bord instructeur**, **Assistant de création de cours**, **Gestion des sessions live**, **Tableau de bord administrateur** et **Gestion des transactions ou des utilisateurs**.

Pour faciliter l'organisation, vous pouvez nommer les fichiers images ainsi : `capture-1-accueil.png`, `capture-2-pricing.png`, `capture-3-dashboard-apprenant.png`, `capture-4-catalogue-cours.png`, `capture-5-details-cours.png`, `capture-6-lecteur-cours.png`, `capture-7-tuteur-ia.png`, `capture-8-communaute.png`, `capture-9-messagerie.png`, `capture-10-dashboard-instructeur.png`, `capture-11-wizard-cours.png`, `capture-12-sessions-live.png`, `capture-13-dashboard-admin.png` et `capture-14-transactions-utilisateurs.png`.

### B. Code source

Le code source du projet est disponible sur GitHub à l'adresse suivante : [https://github.com/ericsson048/edustream.git](https://github.com/ericsson048/edustream.git).

Les principaux emplacements utiles pour une annexe technique sont `src/` pour l'interface et `backend/` pour les services serveur.

### C. Nom de domaine

Le projet est accessible en ligne à l'adresse suivante : [https://edustream-delta.vercel.app/](https://edustream-delta.vercel.app/).
