# import the standard Django Model 
# from built-in library 
from django.db import models 
from django.utils.timezone import now

   
# declare a new model with a name "TimewebModel" 
class TimewebModel(models.Model): 
        # fields of the model 
    title = models.CharField(max_length = 200) 
    description = models.TextField() 
    last_modified = models.DateTimeField(blank = True, default= now) 
    #img = models.ImageField(blank = True, upload_to = "uploads/") 
   
    # renames the instances of the model 
    # with their title name 
    def __str__(self): 
        return self.title + ":" + self.description