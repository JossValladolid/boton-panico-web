# docker container stop boton-de-panico; docker container rm --force boton-de-panico; docker image rm --force boton-de-panico; docker build -t boton-de-panico .; docker run -d -p 8080:80 --name boton-de-panico boton-de-panico
FROM httpd:latest
COPY ./index.html /usr/local/apache2/htdocs/index.html
COPY ./style.css /usr/local/apache2/htdocs/style.css