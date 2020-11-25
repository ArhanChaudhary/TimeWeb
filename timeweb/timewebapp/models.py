# import the standard Django Model 
# from built-in library 
from django.db import models 
    
# declare a new model with a name "GeeksModel" 
class GeeksModel(models.Model): 
        # fields of the model 
    title = models.CharField(max_length = 200,blank=True)
    description = models.TextField(blank=True) 
    last_modified = models.DateTimeField(auto_now_add = False,blank=True) 
    img = models.ImageField(upload_to = "images/",blank=True) 
    
        # renames the instances of the model 
        # with their title name 
    def __str__(self): 
        return self.title 