import os
from pathlib import Path
from decouple import config, Csv
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

# Security: Loaded from .env
SECRET_KEY = config('SECRET_KEY')

# Debug is False by default for production safety
DEBUG = config('DEBUG', default=False, cast=bool)

# 🔥 FIX: default add kiya taaki agar .env me variable set karna bhool
# jao to deploy hote hi Django crash na ho ("ImproperlyConfigured" error).
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='127.0.0.1,localhost', cast=Csv())
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='http://localhost:5173,http://127.0.0.1:5173', cast=Csv())
import os
from pathlib import Path
from decouple import config, Csv
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

# Security: Loaded from .env
SECRET_KEY = config('SECRET_KEY')

# Debug is False by default for production safety
DEBUG = config('DEBUG', default=False, cast=bool)

# 🔥 FIX: default add kiya taaki agar .env me variable set karna bhool
# jao to deploy hote hi Django crash na ho ("ImproperlyConfigured" error).
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='127.0.0.1,localhost', cast=Csv())
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='http://localhost:5173,http://127.0.0.1:5173', cast=Csv())

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'cloudinary_storage',
    'django.contrib.staticfiles',
    'cloudinary',
    
    # Third-party
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    
    # Local
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware', # Ensure this is at the top
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# 🔥 CRITICAL FIX: Ye block pehle poori settings.py me kahin nahi tha.
# Iske bina "Authorization: Token xxx" header Django kabhi samajhta hi nahi tha,
# isliye login hone ke baad bhi Add Game / Delete / Edit Note / Post / Comment
# jaisa koi bhi "logged-in" action fail ho raha tha (401/403 error).
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],

    # 🔥 NAYA: RATE LIMITING — sab kuch .env se configurable hai, kahin
    # bhi number hardcoded nahi hai. 'anon' = public/anonymous requests,
    # 'user' = logged-in user actions, 'auth' = login/register (extra strict),
    # 'payment' = marketplace checkout/payment endpoints.
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': config('THROTTLE_RATE_PUBLIC', default='60/min'),
        'user': config('THROTTLE_RATE_AUTHENTICATED', default='300/min'),
        'auth': config('THROTTLE_RATE_AUTH', default='20/min'),  # login/register — extra strict
        'payment': config('THROTTLE_RATE_PAYMENT', default='30/min'),
    },

    # 🔥 NAYA: Har unhandled error yahan se guzarta hai — kabhi bhi raw
    # stack trace / DB error / file path client ko nahi dikhta (sirf
    # server logs mein). Dekho api/error_handling.py
    'EXCEPTION_HANDLER': 'api.error_handling.custom_exception_handler',
}

# 🔥 NAYA: Throttling + login-backoff ka data yahin store hota hai.
# Local dev / single-process ke liye in-memory cache kaafi hai.
# Production mein multiple gunicorn workers ke saath REDIS_URL set karo
# (.env mein) — warna har worker process ka apna alag counter banega aur
# rate-limit "leak" ho sakta hai (weaker enforcement, crash nahi hoga).
REDIS_URL = config('REDIS_URL', default='')
if REDIS_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': REDIS_URL,
            'OPTIONS': {'CLIENT_CLASS': 'django_redis.client.DefaultClient'},
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'gamevault-cache',
        }
    }

# 🔥 NAYA: Login/Register par exponential backoff ke thresholds — sab
# .env se override ho sakte hain, code mein kahin hardcoded nahi.
AUTH_THROTTLE_BASE_SECONDS = config('AUTH_THROTTLE_BASE_SECONDS', default=1, cast=int)
AUTH_THROTTLE_MAX_SECONDS = config('AUTH_THROTTLE_MAX_SECONDS', default=900, cast=int)      # 15 min cap
AUTH_THROTTLE_WINDOW_SECONDS = config('AUTH_THROTTLE_WINDOW_SECONDS', default=3600, cast=int)  # 1hr no-activity resets counter
AUTH_THROTTLE_MAX_TRACKED_ATTEMPTS = config('AUTH_THROTTLE_MAX_TRACKED_ATTEMPTS', default=10, cast=int)

# RAWG proxy ke liye — frontend ab is key ko kabhi nahi dekhta (backend hi RAWG ko call karta hai)
RAWG_API_KEY = config('RAWG_API_KEY', default='')

ROOT_URLCONF = 'gamevault.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'gamevault.wsgi.application'

DATABASES = {
    'default': dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,
    )
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# 🔥 Cloudinary Integration for Media Uploads in Production
CLOUDINARY_STORAGE = {
    'CLOUD_NAME': config('CLOUDINARY_CLOUD_NAME', default=''),
    'API_KEY': config('CLOUDINARY_API_KEY', default=''),
    'API_SECRET': config('CLOUDINARY_API_SECRET', default='')
}

MEDIA_URL = '/media/'
# If Cloudinary is configured, use it for default media uploads
if config('CLOUDINARY_CLOUD_NAME', default=''):
    DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
else:
    # Fallback for local development if Cloudinary is not set up
    MEDIA_ROOT = BASE_DIR / 'media'

# 🔥 NAYA: Marketplace payment gateway (Razorpay) config.
# TEST mode keys yahan se free milti hain (koi KYC/business account
# zaroori nahi TEST mode ke liye): https://dashboard.razorpay.com/app/keys
# .env mein daalo — code kabhi hardcode mat karna.
RAZORPAY_KEY_SECRET = config('RAZORPAY_KEY_SECRET', default='')

# 🔥 NAYA (Security): Server-side error logging. Deployment platforms
# (Render/Railway/Heroku) sab console output ko apne-aap capture karke
# ek log viewer mein dikhate hain — isliye console handler hi sabse
# reliable/professional choice hai (file rotation manage nahi karni padti
# ephemeral containers par).
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {'format': '[{asctime}] {levelname} {name}: {message}', 'style': '{'},
    },
    'handlers': {
        'console': {'class': 'logging.StreamHandler', 'formatter': 'verbose'},
    },
    'root': {'handlers': ['console'], 'level': 'INFO'},
    'loggers': {
        'gamevault': {'handlers': ['console'], 'level': 'INFO', 'propagate': False},
        'django.request': {'handlers': ['console'], 'level': 'ERROR', 'propagate': False},
        'django.security': {'handlers': ['console'], 'level': 'WARNING', 'propagate': False},
    },
}

# 🔥 NAYA (Security — File Upload Safety): Upload size limit. Pehle koi
# limit hi nahi thi, koi bhi arbitrarily bada file bhej sakta tha (DoS risk).
# .env se configurable — MB mein specify karo.
MAX_UPLOAD_SIZE_MB = config('MAX_UPLOAD_SIZE_MB', default=5, cast=int)
DATA_UPLOAD_MAX_MEMORY_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024

# 🔥 NAYA (Security — Production hardening): Ye settings SIRF production
# (DEBUG=False) mein activate hoti hain — local dev (http://127.0.0.1)
# HTTPS use nahi karta, isliye wahan ye off rehti hain warna runserver
# toot jaata.
if not DEBUG:
    SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=31536000, cast=int)  # 1 saal
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    # Render/Railway/Heroku jaisi platforms proxy ke peeche HTTPS terminate karti hain,
    # isliye Django ko batana zaroori hai ki proxy se aane wala X-Forwarded-Proto header trust kare
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# ── Twilio SMS (OTP Verification) ────────────────────────────────────────────
# Credentials from .env — NEVER committed to source control.
# The screenshot provided an API Key (SK...), not the main Account SID (AC...).
# Twilio Python SDK supports API Key auth: Client(api_key, api_secret, account_sid)
TWILIO_ACCOUNT_SID    = config('TWILIO_ACCOUNT_SID', default='')
TWILIO_API_KEY_SID    = config('TWILIO_API_KEY_SID', default='')
TWILIO_API_KEY_SECRET = config('TWILIO_API_KEY_SECRET', default='')
TWILIO_FROM_NUMBER    = config('TWILIO_FROM_NUMBER', default='')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'