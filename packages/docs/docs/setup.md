# Installation

To deploy your own UTRAD Werewolf server, follow these steps.

:::info

This is a web-based project, but our docs do not assume you have any prior knowledge of web technologies, including JavaScript and HTML. Just follow the steps below and you should be able to get things working! However, we *do* assume the following:

- You have basic knowledge of **Git** and **GitHub**.
- You have a valid **GitHub account**.
- You have a valid  **Google account** (because we rely on Firebase).
- You can use a terminal (command line).

:::

## Services We Depend on

In order to make it easy for everyone to set up a system that involves secure user authentication and realtime communication, we rely on several well-known services:

- [**Netlify**](https://netlify.com/): This is a web hosting service that allows for the "push and deploy" experience.
- [**Firebase**](https://firebase.google.com/): This is a BaaS (Backend-as-a-Service) managed by Google. We use this service to take care of user management, user authentication and database (Firebase [Realtime Database](https://firebase.google.com/docs/database)).

The use of these services is **typically** free for a small research project. For example, Firebase's Spark plan can hold up to 1GB of game log data (text) for free, which should generally be sufficient. Still, please get an overview of what these services do and their pricing rules.

## Mininum Deployment Steps

### 1. Deploy Your Site Using Netlify

Press the button below, and follow the displayed steps. If you're not a Netlify user yet, you need to sign up (you can use your GitHub account). You need to connect your GitHub account and Netlify. It automatically creates a fork of our "utrad-werewolf" repository into your GitHub account.

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/smikitky/jinro?base=packages/webapp)

If a deployment succeeds, you can open the URL of your site. A screen like this should appear in your browser.

(TODO: Screenshot)

It shows an error, and this is because we have not set up our database (the place to store the actual game log data) yet. We use Firebase Realtime Database, so let's set this up.

:::note

You can change the URL of your site in the site's dashboard. If you like, you can use a custom domain. If you want to customize the URL, it's recommended to do it here because Firebase will use that information.

:::

### 2. Create a Firebase Project and Save Authentication Data

- [Visit Firebase](https://firebase.google.com/), and sign in using your Google account.
- Create a new Firebase project. In this tutorial, we use `my-wolf` as the example project name. You don't need to enable Google Analytics.

### 3. Log In to the Werewolf Server and Become Admin

### 4. Start Your First Game

## Run on Your Local Machine (Optional)

You can also run this project locally on your development machine. It still needs Firebase Realtime Database account.

- Install Node.js on your machine. Node.JS is a JavaScript runtime, and it is required to test the app locally. Windows users can simply use the installer available on the official site. If you're on Linux, it's usually easiest to use [NVM (Node Version Manager)](https://github.com/nvm-sh/nvm).
- Clone the `utrad-werewolf` repository, and do `cd utrad-werewolf/packages/webapp`. (This repository is a monorepo and the actual web UI is located here.)
- Configure environment variables. Make a new file named `.env` under `webapp`, and define required environment variables. Your `.env` file should look like this:
  ```env
  ......
  ```
- Run the following on a terminal. This starts a local web server.
  ```bash
  $ npm ci
  $ npm run dev
  ```
- Open a browser by clicking the shown link (which should look like `http://localhost:8888/`).