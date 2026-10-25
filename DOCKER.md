# Lancer EduStream avec Docker

## Premiere configuration

1. Installez Docker Desktop puis demarrez-le.
2. Copiez `.env.docker.example` vers `.env.docker`.
3. Dans `.env.docker`, remplacez chaque occurrence de `192.168.1.50` par l'adresse IPv4 reservee de cette machine. Sous Windows, affichez-la avec `ipconfig` puis configurez une reservation DHCP dans le routeur.
4. Remplacez `POSTGRES_PASSWORD` et `DJANGO_SECRET_KEY` par des valeurs longues et secretes.

## Demarrage

Depuis le dossier `edustream` :

```powershell
docker compose up --build -d
```

L'interface web est disponible ici :

```text
http://ADRESSE_IP_DE_LA_MACHINE:3000
```

L'API reste aussi disponible pour le mobile ici :

```text
http://ADRESSE_IP_DE_LA_MACHINE:8100/api/v1
```

Dans l'application mobile, ouvrez **Configurer l’adresse du serveur** depuis l'écran de connexion (ou **Paramètres** une fois connecté) et saisissez cette adresse. Elle est enregistrée sur le téléphone : vous pourrez la modifier quand l'adresse IP change, sans générer un nouvel APK. Le téléphone et l'ordinateur doivent être sur le même réseau Wi-Fi. Une réservation DHCP ou un nom DNS reste préférable pour éviter que l'adresse change.

## Commandes utiles

```powershell
docker compose logs -f backend
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py seed_demo_data
docker compose down
```

`docker compose down` arrete les services sans supprimer les donnees. Utilisez `docker compose down -v` uniquement si vous acceptez d'effacer PostgreSQL, Redis, les medias et les journaux Docker.
