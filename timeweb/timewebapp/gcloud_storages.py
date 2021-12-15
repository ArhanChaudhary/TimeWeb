"""
https://medium.com/@umeshsaruk/upload-to-google-cloud-storage-using-django-storages-72ddec2f0d05
GoogleCloudStorage extension classes for MEDIA and STATIC uploads
"""
from django.conf import settings
from storages.backends.gcloud import GoogleCloudStorage
from storages.utils import setting
from urllib.parse import urljoin


class GoogleCloudMediaFileStorage(GoogleCloudStorage):
    """
    Google file storage class which gives a media file path from MEDIA_URL not google generated one.
    """
    bucket_name = setting('GS_MEDIA_BUCKET_NAME')


class GoogleCloudStaticFileStorage(GoogleCloudStorage):
    """
    Google file storage class which gives a media file path from MEDIA_URL not google generated one.
    """
    
    bucket_name = setting('GS_STATIC_BUCKET_NAME')