# suppliers-api

## Auth0 environment variables
This solution requires the following env variables for integration with Auth0:
  - AUTH0_DOMAIN
  - AUTHO_CLIENT_ID
  - AUTH0_CLIENT_SECRET
  - AUTH0_CONNECTION

Since these are senstive they are not included in the docker-compose.yml.
The docker file will source `.env` file if it is present in the project directory, this can be used for local development.
