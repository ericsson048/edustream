import os
from datetime import timedelta
from importlib.util import find_spec
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def load_local_env():
    env_path = BASE_DIR / ".env"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


load_local_env()


def env_bool(name, default=False):
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "change-me-in-production")
DEBUG = os.getenv("DJANGO_DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = [h for h in os.getenv("DJANGO_ALLOWED_HOSTS", "*").split(",") if h]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "django_filters",
    "apps.users",
    "apps.courses",
    "apps.learning",
    "apps.billing",
    "apps.ai_tutor",
    "apps.live",
    "apps.community",
    "apps.messaging",
    "apps.admin_dashboard",
]

if find_spec("channels"):
    INSTALLED_APPS.append("channels")
if find_spec("corsheaders"):
    INSTALLED_APPS.append("corsheaders")
if find_spec("drf_spectacular"):
    INSTALLED_APPS.append("drf_spectacular")

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
if find_spec("corsheaders"):
    MIDDLEWARE.insert(1, "corsheaders.middleware.CorsMiddleware")

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DB_ENGINE = os.getenv("DB_ENGINE", "django.db.backends.sqlite3")
if DB_ENGINE == "django.db.backends.sqlite3":
    DATABASES = {
        "default": {
            "ENGINE": DB_ENGINE,
            "NAME": os.getenv("DB_NAME", str(BASE_DIR / "db.sqlite3")),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": DB_ENGINE,
            "NAME": os.getenv("DB_NAME", "edustream"),
            "USER": os.getenv("DB_USER", "postgres"),
            "PASSWORD": os.getenv("DB_PASSWORD", "ericsson"),
            "HOST": os.getenv("DB_HOST", "127.0.0.1"),
            "PORT": os.getenv("DB_PORT", "5432"),
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = os.getenv("TZ", "Africa/Johannesburg")

USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "users.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}
if find_spec("drf_spectacular"):
    REST_FRAMEWORK["DEFAULT_SCHEMA_CLASS"] = "drf_spectacular.openapi.AutoSchema"
if not find_spec("django_filters"):
    REST_FRAMEWORK["DEFAULT_FILTER_BACKENDS"] = (
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    )

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
}

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://127.0.0.1:3000")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0").strip()
DJANGO_CACHE_URL = os.getenv("DJANGO_CACHE_URL", "redis://127.0.0.1:6379/1").strip()
USE_REDIS_CHANNELS = env_bool("USE_REDIS_CHANNELS", True)
USE_REDIS_CACHE = env_bool("USE_REDIS_CACHE", True)

CHANNEL_LAYERS = {}
if find_spec("channels"):
    default_channel_backend = (
        "channels_redis.core.RedisChannelLayer"
        if USE_REDIS_CHANNELS and REDIS_URL and find_spec("channels_redis")
        else "channels.layers.InMemoryChannelLayer"
    )
    channel_backend = os.getenv("CHANNEL_BACKEND", default_channel_backend)
    channel_layer = {"BACKEND": channel_backend}
    if channel_backend == "channels_redis.core.RedisChannelLayer":
        channel_layer["CONFIG"] = {
            "hosts": [REDIS_URL],
        }
    CHANNEL_LAYERS = {"default": channel_layer}

default_cache_backend = (
    "django.core.cache.backends.redis.RedisCache"
    if USE_REDIS_CACHE and DJANGO_CACHE_URL and find_spec("redis")
    else "django.core.cache.backends.locmem.LocMemCache"
)
cache_backend = os.getenv("CACHE_BACKEND", default_cache_backend)

if cache_backend == "django.core.cache.backends.redis.RedisCache":
    CACHES = {
        "default": {
            "BACKEND": cache_backend,
            "LOCATION": DJANGO_CACHE_URL,
            "KEY_PREFIX": os.getenv("DJANGO_CACHE_KEY_PREFIX", "edustream"),
            "TIMEOUT": int(os.getenv("DJANGO_CACHE_TIMEOUT", "300")),
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": cache_backend,
            "LOCATION": os.getenv("DJANGO_CACHE_LOCATION", "edustream-local-cache"),
            "TIMEOUT": int(os.getenv("DJANGO_CACHE_TIMEOUT", "300")),
        }
    }

CORS_ALLOWED_ORIGINS = [o for o in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if o]
CORS_ALLOW_CREDENTIALS = True

SPECTACULAR_SETTINGS = {
    "TITLE": "EduStream API",
    "DESCRIPTION": "API backend for EduStream LMS",
    "VERSION": "1.0.0",
}
