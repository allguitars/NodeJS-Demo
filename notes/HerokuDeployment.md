# Deploying Node Applications

## Introduciton

Basically you have two options for deploying a Node application. 

- PaaS: platform as a service provider
- Docker

### PaaS
The platform as a service provider is a great option if you don't want to get involved with infrastructures. If you don't want to worry about servers, load balancers, reverse proxies, or restarting your application on a crash, then a platform as a service provider is your best friend. There are quite a few options in this space, such as **Heroku**, **Google Cloud Platform**, **AWS**, **Azure**, and so on.

### Docker

In contrast, if you want to have more control over your deployment and deploy your Node applications to your own web servers, then **Docker** is a great option. With Docker, you can easily create an image of your application and simply deploy that image to any computers you want.

## Preparing the App for Production

So, we're going to install a couple of packages. The first one is **helmet**.

```shell
$ npm i helmet
```

**Helmet** is a middleware package that can protect your application from well-known web vulnerabilities.

The other package we're going to install is **compression**, and we use that to compress the HTTP response that we send to the client.

```shell
$ npm i compression
```

Under _startup_ folder, create a file called _prod.js_. All the middlewares that we need to install for a **production environment** will be added here. 

Just like our other startup modules, we want to export a function. This function should take our application object (_app_) because we're going to use this to install these middleware pieces.

_prod.js_
```js
const helmet = require('helmet');
const compression = require('compression');

module.exports = function (app) {
  app.use(helmet());  // helmet() is a function that we need to call in order to get a middleware function
  app.use(compression());
}

```

_index.js_

```js
// added
require('./startup/prod')(app);
```

Here we can also write code to conditionally load the _prod_ module if we are in the production environment, but it doesn't really matter.

## Getting Start with Heroku

### Install Heroku CLI

Search "Heroku CLI" with google, and you will find the installation instruction.

For **Mac**
```shell
$ brew install heroku/brew/heroku
```

To check the version that you have installed,

```shell
$ heroku -v
```

Longin to Heroku with CLI,

```shell
$ heroku login
```

Now chances are this step may fail on your machine if you're behind a fire wall, which requires the use of a proxy to connect with external HTTP services. If that's the case, you need to set an environment variable.

```shell
$ export HTTP_PROXY=http://proxy.server.com:1234
```

Once you set that, try logging in with "heroku login" one more time.

## Preparing the App for Deployment

When we deploy our application to Heroku, Heroku will start our application by running the command, **npm start**. So, we need to define the **start** script in _package.json_.

_package.json_

```json
  "scripts": {
    ...

    "start": "node index.js"
  },
```

In production we're not going to use **nodemon**, which is purely for development. We used **nodemon** to watch those changes, and restart our application automatically.

Now, there is one more change we need to make to package.json to prepare our application to be deployed to Heroku. We add a new property **engines** where we define the version of node we are using.

```json
  "engines": {
    "node": "8.11.1"
  },
```

