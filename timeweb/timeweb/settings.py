"""
Django settings for timeweb project.

Generated by 'django-admin startproject' using Django 3.1.3.

For more information on this file, see
https://docs.djangoproject.com/en/3.1/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/3.1/ref/settings/
"""

from pathlib import Path
import os

# SECURITY WARNING: don't run with debug turned on in production!
try:
    DEBUG = os.environ['DEBUG'] == "True"
except KeyError:
    DEBUG = True
FIX_DEBUG_LOCALLY = DEBUG
# DEBUG = False

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

CSP_CONNECT_SRC = ("'self'", 'https://www.google-analytics.com', 'https://www.googletagmanager.com', 'https://accounts.google.com', "https://storage.googleapis.com", "https://www.google.com")
CSP_DEFAULT_SRC = ("'self'", 'https://www.googletagmanager.com', "https://storage.googleapis.com", "https://www.google.com", "https://unpkg.com")
if DEBUG:
    CSP_DEFAULT_SRC += ("http://127.0.0.1:35729", )
    CSP_CONNECT_SRC += ("ws://127.0.0.1:35729", )
CSP_SCRIPT_SRC = CSP_DEFAULT_SRC # Needs to be set so nonce can be added
CSP_STYLE_SRC = CSP_DEFAULT_SRC
CSP_INCLUDE_NONCE_IN = ('script-src', 'style-src' ) # Add nonce b64 value to header, use for inline scripts
CSP_OBJECT_SRC = ("'none'", )
CSP_BASE_URI = ("'none'", )
CSP_IMG_SRC = ("'self'", "data:", "https://storage.googleapis.com")

PWA_SERVICE_WORKER_PATH = BASE_DIR / 'timewebapp/static/timewebapp/js/serviceworker.js' if DEBUG else "https://storage.googleapis.com/twstatic/timewebapp/js/serviceworker.js"
PWA_APP_DEBUG_MODE = False
PWA_APP_NAME = "TimeWeb PS" if DEBUG else "TimeWeb"
PWA_APP_DESCRIPTION = "TimeWeb PS APP" if DEBUG else "TimeWeb App"
PWA_APP_THEME_COLOR = '#000000'
PWA_APP_BACKGROUND_COLOR = '#000000'
PWA_APP_DISPLAY = 'fullscreen'
PWA_APP_SCOPE = '/'
PWA_APP_ORIENTATION = 'portrait'
PWA_APP_START_URL = '/'
PWA_APP_DIR = 'ltr'
PWA_APP_LANG = 'en-US'
try:
    SECRET_KEY = os.environ['SECRETKEY']
except KeyError:
    from django.core.management.utils import get_random_secret_key
    SECRET_KEY = get_random_secret_key()
# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/3.1/howto/deployment/checklist/
if DEBUG or FIX_DEBUG_LOCALLY:
    ALLOWED_HOSTS = ['*']
else:
    ALLOWED_HOSTS = ['timeweb.io']
# Application definition

CSRF_COOKIE_SECURE = not (DEBUG or FIX_DEBUG_LOCALLY)
SESSION_COOKIE_SECURE = not (DEBUG or FIX_DEBUG_LOCALLY)

SECURE_SSL_REDIRECT = not (DEBUG or FIX_DEBUG_LOCALLY)
SECURE_HSTS_SECONDS = 63072000 # 2 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
INSTALLED_APPS = [
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'django.contrib.sites',

    'timewebauth',
    'timewebapp',
    'navbar',
    'misc',
    'multiselectfield',
    'django.contrib.admin', # admin needs to be after 'timewebapp' for some reason I forgot but it needs to be here
    'pwa',
    'colorfield',
    'django_cleanup.apps.CleanupConfig',

    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',

    "django_minify_html",
]

INTERNAL_IPS = [
    "127.0.0.1",
]
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'csp.middleware.CSPMiddleware',
    'api.middleware.CatchRequestDataTooBig',

    'common.middleware.DefineIsExampleAccount',
    'common.middleware.CommonRatelimit',
    # don't add APIValidationMiddleware; these are only specific to their corresponding app view functions
    # CatchRequestDataTooBig must be a global middleware so it can be ordered before PopulatePost

    # Even though cloudflare has an html minfier, let's instead use our own so the debug and non debug versions' html stays consistent
    # It's also more efficient than cf's html minifier
    "django_minify_html.middleware.MinifyHtmlMiddleware",
]
if DEBUG:
    INSTALLED_APPS.append('livereload')
    MIDDLEWARE.append('livereload.middleware.LiveReloadScript')
    
CSRF_FAILURE_VIEW = 'common.utils._403_csrf'
ROOT_URLCONF = 'timeweb.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            BASE_DIR / 'common' / 'templates',
            BASE_DIR / 'timewebapp' / 'static' / 'timewebapp' / 'svg'
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'timewebapp.views.append_default_context'
            ],
        },
    },
]
CONN_MAX_AGE = 15

# Caches are no less more expensive than querying manually in all of timeweb's cases
# CACHES = {
#     'default': {
#         'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
#         'LOCATION': 'assignment_cache',
#     }
# }

LOGIN_REDIRECT_URL = '/'
LOGOUT_REDIRECT_URL = '/'

WSGI_APPLICATION = 'timeweb.wsgi.application'

# if i use float arithmetic i must convert these settings to ints or else internal errors are mean
MAX_BACKGROUND_IMAGE_UPLOAD_SIZE = 10 * 1048576 # 10 MB (max background image size)
DATA_UPLOAD_MAX_MEMORY_SIZE = 500 * 1024 # 500 KB (max size for data sent by ajax by assignments)

# Database
# https://docs.djangoproject.com/en/3.1/ref/settings/#databases
if os.environ.get('DATABASE_URL') is not None:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'HOST': os.environ['PGHOST'],
            'PORT': os.environ['PGPORT'],
            'NAME': os.environ.get('PGDATABASE', 'timewebdb'),
            'USER': os.environ.get('PGUSER', 'postgres'),
            'PASSWORD': os.environ['PGPASSWORD'],
        }
    }
else:
    # If running locally, use a sqlite database
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
DEFAULT_AUTO_FIELD='django.db.models.AutoField' 
# Password validation
# https://docs.djangoproject.com/en/3.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
]

# Internationalization
# https://docs.djangoproject.com/en/3.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = "America/Los_Angeles"

USE_I18N = True

USE_L10N = True

USE_TZ = True

MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
MEDIA_URL = '/media/'
# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/3.1/howto/static-files/
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static')
STATICFILES_DIRS = [
    BASE_DIR / "common" / "static",
]
if DEBUG:
    STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.ManifestStaticFilesStorage'
else:
    # Bunch of gitignored files ;)
    DEFAULT_FILE_STORAGE = 'timewebapp.gcloud_storages.GoogleCloudMediaFileStorage'
    STATICFILES_STORAGE = 'timewebapp.gcloud_storages.GoogleCloudStaticFileStorage'
    
    GS_DEFAULT_ACL = None
    GS_QUERYSTRING_AUTH = False
    GS_STATIC_BUCKET_NAME = 'twstatic'
    GS_MEDIA_BUCKET_NAME = 'twmedia'

    GS_PROJECT_ID = 'timeweb-308201'
    from google.oauth2 import service_account
    GS_CREDENTIALS = service_account.Credentials.from_service_account_file(
        BASE_DIR / "sa_private_key.json"
    )
# Django Logging config
ROOT_LOG_LEVEL = 'DEBUG' if DEBUG else 'WARNING'
DJANGO_LOG_LEVEL = 'INFO' if DEBUG else 'WARNING'
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple'
        },
    },
    'root': {
        'handlers': ['console'],
        'level': ROOT_LOG_LEVEL,
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': DJANGO_LOG_LEVEL,
        }
    },
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d}>> {message}',
            'style': '{',
        },
        'simple': {
            'format': '{asctime} <<{levelname}>> {message}',
            'style': '{',
        },
    },
}

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend'
]
SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': [
            # We only need to request for email
            'email',
        ],
        'AUTH_PARAMS': {
            'access_type': 'offline',
        }
    }
}
AUTH_USER_MODEL = 'timewebauth.TimewebUser'
ACCOUNT_DEFAULT_HTTP_PROTOCOL = "http" if (DEBUG or FIX_DEBUG_LOCALLY) else "https"
SOCIALACCOUNT_AUTO_SIGNUP = False # Always prompt for username
ACCOUNT_SESSION_REMEMBER = True
ACCOUNT_SIGNUP_PASSWORD_ENTER_TWICE = False

ACCOUNT_AUTHENTICATION_METHOD = "email"
ACCOUNT_LOGIN_ON_EMAIL_CONFIRMATION = True
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_EMAIL_VERIFICATION = 'mandatory'

SOCIALACCOUNT_ADAPTER = 'timewebauth.adapter.ExampleAccountSocialLoginAdapter'
ACCOUNT_ADAPTER = 'timewebauth.adapter.NonUniqueUsernameAccountAdapter'

ACCOUNT_FORMS = {
    'login': 'timewebauth.forms.LabeledLoginForm',
    'signup': 'timewebauth.forms.LabeledSignupForm',
    'add_email': 'timewebauth.forms.LabeledAddEmailForm',
    'change_password': 'timewebauth.forms.LabeledChangePasswordForm',
    'set_password': 'timewebauth.forms.LabeledTwoPasswordForm',
    'reset_password': 'timewebauth.forms.LabeledResetPasswordForm',
    'reset_password_from_key': 'timewebauth.forms.LabeledTwoPasswordForm',
    'disconnect': 'allauth.socialaccount.forms.DisconnectForm',
}

SOCIALACCOUNT_FORMS = {
    'disconnect': 'timewebauth.forms.LabeledSocialaccountDisconnectForm',
    'signup': 'timewebauth.forms.LabeledSocialaccountSignupForm',
}

if (DEBUG or FIX_DEBUG_LOCALLY):# and 0:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
EMAIL_USE_TLS = True
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
ACCOUNT_EMAIL_SUBJECT_PREFIX = ''
DEFAULT_FROM_EMAIL = 'TimeWeb E-mail Service <arhanc.cs@gmail.com>'
EMAIL_HOST_USER = 'arhanc.cs@gmail.com'
MANAGERS = [('Arhan', 'arhan.ch@gmail.com')]
EMAIL_HOST_PASSWORD = os.environ.get('GMAILPASSWORD', None)

EXAMPLE_ACCOUNT_EMAIL = 'timeweb@example.com'

RECAPTCHA_SECRET_KEY = os.environ.get('RECAPTCHA_SECRET_KEY', None)



# App constants

# https://stackoverflow.com/questions/48242761/how-do-i-use-oauth2-and-refresh-tokens-with-the-google-api
GC_SCOPES = ['https://www.googleapis.com/auth/classroom.student-submissions.me.readonly', 'https://www.googleapis.com/auth/classroom.courses.readonly']
GC_CREDENTIALS_PATH = BASE_DIR / "gc_api_credentials.json"
if DEBUG or FIX_DEBUG_LOCALLY:
    GC_REDIRECT_URI = "http://localhost:8000/api/gc-auth-callback"
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
else:
    GC_REDIRECT_URI = "https://timeweb.io/api/gc-auth-callback"
# https://stackoverflow.com/questions/53176162/google-oauth-scope-changed-during-authentication-but-scope-is-same
os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'

MAX_NUMBER_OF_TAGS = 5
DELETED_ASSIGNMENTS_PER_PAGE = 70
EXAMPLE_ASSIGNMENT = {
    "name": "Reading a Book (EXAMPLE ASSIGNMENT)",
    "x": 30, # Not the db value of x, in this case is just the number of days in the assignment
    "unit": "Page",
    "y": "400.00",
    "blue_line_start": 0,
    "skew_ratio": "1.0000000000",
    "time_per_unit": "3.00",
    "funct_round": "1.00",
    "min_work_time": "60.00",
    "break_days": [],
    "dynamic_start": 0,
    "description": "Example assignment description"
}
EDITING_EXAMPLE_ACCOUNT = False

from common.views import logger
def GET_CLIENT_IP(group, request):
    if 'HTTP_CF_CONNECTING_IP' in request.META:
        return request.META['HTTP_CF_CONNECTING_IP']
    logger.warning(f"request for {request} has no CF_CONNECTING_IP, ratelimiting is defaulting to REMOTE_ADDR: {request.META['REMOTE_ADDR']}")
    return request.META['REMOTE_ADDR']
DEFAULT_GLOBAL_RATELIMIT = '5/s'

# Changelog
from json import load as json_load
with open("changelogs.json", "r") as f:
    CHANGELOGS = json_load(f)