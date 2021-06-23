TimeWeb — An online time manager that prioritizes, sorts, and lists each of your daily school or work assignments. Get started with your free account today! MSJHS warriors!

Installation (Linux):

1. Install pip on your local machine

2. Copy the repository on your local machine


```
git clone https://github.com/ArhanChaudhary/TimeWeb
```

3. Go into the project directory

```
cd TimeWeb
```

4. Create a virtual envionment to handle project dependencies

```
pip install virtualenv
virtualenv timeweb_env
source timeweb_env/bin/activate
```

5. Install all project dependencies

```
cd timeweb
pip install -r requirements.txt
```

6. Create the database

```
python manage.py migrate
```

7. Create a superuser

```
python manage.py createsuperuser
```

8. Start the server

```
python manage.py runserver
```

9. Go to http://localhost:8000/ and log in with your created user

Tips for development:
- Ensure your cache is updated if you modify a static file
- Run "python manage.py makemigrations;python manage.py migrate" if you change the fields in models.py