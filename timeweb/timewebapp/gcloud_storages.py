"""
https://medium.com/@umeshsaruk/upload-to-google-cloud-storage-using-django-storages-72ddec2f0d05
GoogleCloudStorage extension classes for MEDIA and STATIC uploads
"""
from storages.backends.gcloud import GoogleCloudStorage
from storages.utils import setting


class GoogleCloudMediaFileStorage(GoogleCloudStorage):
    """
    Google file storage class which gives a media file path from MEDIA_URL not google generated one.
    """
    bucket_name = setting('GS_MEDIA_BUCKET_NAME')
    querystring_auth = True

class GoogleCloudStaticFileStorage(GoogleCloudStorage):
    """
    Google file storage class which gives a media file path from MEDIA_URL not google generated one.
    """
    
    bucket_name = setting('GS_STATIC_BUCKET_NAME')