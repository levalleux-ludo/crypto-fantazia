# Stage 0, "build-stage", based on Node.js, to build and compile Angular
FROM node:lts-alpine as build

# set working directory
WORKDIR /app

# add `/app/node_modules/.bin` to $PATH
ENV PATH /app/node_modules/.bin:$PATH

# install and cache app dependencies
COPY package.json /app/package.json
RUN npm install
RUN npm install -g @angular/cli

# add app
COPY . /app

# run tests

RUN ls -ld /app/node_modules/jq*

# generate build
RUN ng build --output-path=dist --prod

############
### prod ###
############

# Stage 1, based on Nginx, to have only the compiled app, ready for production with Nginx
FROM nginx:stable-alpine

## Remove default Nginx website
RUN rm -rf /usr/share/nginx/html/*

# copy artifact build from the 'build environment'
COPY --from=build /app/dist /usr/share/nginx/html

# a custom NGINX configuration is needed in our setup to ensure that the built-in Angular routing module can be activated
COPY ./nginx/nginx.conf /etc/nginx/conf.d/default.conf

# expose port 80
EXPOSE 80

# run nginx
CMD ["nginx", "-g", "daemon off;"]
