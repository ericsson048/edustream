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
http://ADRESSE_IP_DE_LA_MACHINE:8000/api/v1
```

Pour l'application mobile, renseignez `EXPO_PUBLIC_API_URL` avec cette derniere adresse. L'adresse ne reste stable sur votre reseau Wi-Fi que si le routeur lui attribue une reservation DHCP.

## Commandes utiles

```powershell
docker compose logs -f backend
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py seed_demo_data
docker compose down
```

`docker compose down` arrete les services sans supprimer les donnees. Utilisez `docker compose down -v` uniquement si vous acceptez d'effacer PostgreSQL, Redis, les medias et les journaux Docker.
