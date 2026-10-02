FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# 1. Installer uv en utilisant l'installateur officiel de l'image de référence
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# 2. Copier requirements.txt et installer les dépendances ultra rapidement
COPY requirements.txt ./
RUN uv pip install --system --no-cache -r requirements.txt

# 3. Copier le reste du code
COPY . .

EXPOSE 8000

CMD ["sh", "-c", "python manage.py migrate --noinput && daphne -b 0.0.0.0 -p 8000 config.asgi:application"]