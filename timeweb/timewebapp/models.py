# import the standard Django Model
# from built-in library
from django.db import models


# declare a new model with a name "TimewebModel"
class TimewebModel(models.Model):
    # fields of the model
    title = models.CharField(max_length=200,blank=True)
    description = models.TextField(blank=True)

    # renames the instances of the model
    # with their title name
    def __str__(self):
        return self.title
