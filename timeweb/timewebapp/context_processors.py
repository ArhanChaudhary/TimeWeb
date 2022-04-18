from django.conf import settings

def append_default_context(request):
    return {
        "EXAMPLE_ACCOUNT_EMAIL": settings.EXAMPLE_ACCOUNT_EMAIL,
        "EXAMPLE_ASSIGNMENT_NAME": settings.EXAMPLE_ASSIGNMENT_JSON["name"],
        "MAX_NUMBER_OF_TAGS": settings.MAX_NUMBER_OF_TAGS,
        "EDITING_EXAMPLE_ACCOUNT": settings.EDITING_EXAMPLE_ACCOUNT,
        "DEBUG": settings.DEBUG,
    }