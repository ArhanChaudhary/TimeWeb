from allauth.account.adapter import DefaultAccountAdapter

class NonUniqueUsernameAccountAdapter(DefaultAccountAdapter):
    def clean_username(self, *args, **kwargs):
        kwargs.update({"shallow": True})
        return super().clean_username(*args, **kwargs)