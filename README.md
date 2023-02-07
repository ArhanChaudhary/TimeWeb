TimeWeb is a time management application that visualizes, quantifies, and prioritizes your assignments' work. Unlike typical planners, TimeWeb simplifies the most complex of work schedules by graphing your work until they are due.

https://timeweb.io/

<hr>

Are you interested in using TimeWeb, but concerned about privacy? Following this procedure, you can host TimeWeb locally:
  
1. Install the [git](https://git-scm.com/downloads) and [python](https://www.python.org/downloads/) command-line interfaces. Type the following commands in your terminal or command prompt.

2. Download this repository
```bash
git clone https://github.com/ArhanChaudhary/TimeWeb
```
3. Create a virtual environment to isolate dependencies
 ```bash
cd TimeWeb
pip install virtualenv
virtualenv timeweb_env
```
4. And activate it
- Windows:
```bash
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope
timeweb_env/Scripts/Activate.ps1
cd timeweb
```
- Linux/Mac:
```bash
source timeweb_env/bin/activate
cd timeweb
```
5. Install the project dependencies
```bash
pip install -r requirements.txt
```
6. Create the database
```bash
python manage.py migrate
python manage.py createsuperuser
```
Note that you may not see what you type for your password. It is purposefully obfuscated.

7. Start the server
```bash
python manage.py runserver
```
8. Go to http://localhost:8000/ and log in with your created user from step 6.

Note: to restart the server, repeat steps 4 and 7.