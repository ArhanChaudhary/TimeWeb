from django.conf import settings

def app_static_factory(app_name):
    def app_static(url_path):
        return f"static/{app_name}/{url_path}" if settings.DEBUG else f'https://storage.googleapis.com/twstatic/{app_name}/{url_path}'
    return app_static