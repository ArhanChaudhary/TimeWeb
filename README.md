TimeWeb is a tool designed to help users manage their time by prioritizing, sorting, and listing each of their school or work assignments every day. Once the users input their assignments, their work is graphed over the days until it is due.

Commands for Google Cloud Platform Deployment (for MacOS)
1. Install gcloud CLI (you can use homebrew for simpler install)
2. Perform "gcloud init". This will open browser to authenticate and allow access to get Authentication token needed by gcloud CLI tool.
3. Install Cloud SQL Proxy. Steps follow,
```
curl -o cloud_sql_proxy https://dl.google.com/cloudsql/cloud_sql_proxy.darwin.amd64
chmod +x cloud_sql_proxy
```
4. Create SQL Cloud Instance (Note: We will add flags to create PostGres otherwise default is MySQL)
```bash
gcloud sql instances create timewebdbinstance --cpu=1 --memory=3840MB --region=us-west2 --database-version=POSTGRES_12

A list of valid regions can be found here: https://cloud.google.com/sql/docs/postgres/instance-settings#region-values
Note: Public IP address (Used only when SQL Proxy is NOT used)
```

5. Add the DB user/pass

   ```
   gcloud sql users set-password postgres --instance=timewebdbinstance --password=$PASSWORD
   ```

6. Verify database instance

   ```
   gcloud sql instances describe timewebdbinstance
   ```

   Note the connection name (timeweb-308201:us-west2:timewebdatabase) for the next step

7. Start the Cloud SQL Proxy

   ```
   ./cloud_sql_proxy -instances="timeweb-308201:us-west2:timewebdatabase"=tcp:3306
   ```

8. Open a new terminal and create a database

   ```
   gcloud sql databases create timewebdb --instance=timewebdbinstance --charset=UTF8 --collation=en_US.UTF8
   ```

9. Set the password for the default user postgres

   ```
   gcloud sql users set-password postgres --instance=timewebdbinstance --prompt-for-password
   ```

10. Change the username and password attributes for "DATABASES" in settings.py

11. Get the values of the instance again

    ```
    gcloud sql instances describe timewebdbinstance
    ```

    copy the `connectionName` value for use in the next step.

12. Create superuser locally using proxy