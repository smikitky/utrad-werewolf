---
title: Creating AI Bot
sidebar_position: 6
---

# Creating AI Bot to Drive NPC Accounts

## Basics of API

To control players programmatically, you need to access our web API (simple REST API). You can access the API using any programming language, including JavaScript, Python, Java, C++, and so on.

The endpoint (URL) of the API is `https://<domain>/.netlify/functions/api`, where `<domain>` is the domain of your app (something like 'your-site.netlify.app', or something like `localhost:8888` when you're running the app locally).

Here is an example API call. This will have the same effect as if an NPC user ("alice-bot") made a "talk" message in her web browser during the specified game.

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="lang">
<TabItem value="js" label="Node.js">

`fetch` is available by default for Node.js &ge; 18. If you're using an older version, install `node-fetch` using NPM.

```js
// import fetch from "node-fetch";

const res = fetch("https://your-site/.netlify/functions/api", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    authorization: "Bearer 1a2b3c4d",
    "x-godmode-uid-override": "alice-bot",
  },
  data: {
    action: "talk",
    payload: {
      gameId: "-NXC7Mw8XomYbbsRa76i",
      content: "Hello, I am a villager!",
    },
  },
});
```

</TabItem>
<TabItem value="py" label="Python">

```py
import requests
import json

headers = {
    "content-type": "application/json",
    "authorization": "Bearer 1a2b3c4d",
    "x-godmode-uid-override": "alice-bot"
}

data = {
    "action": "talk",
    "payload": {
      "gameId": "-NXC7Mw8XomYbbsRa76i",
      "content": "Hello, I am a villager!"
    }
}

response = requests.post(
    "https://your-site/.netlify/functions/api",
    headers=headers,
    data=json.dumps(data)
)
```

</TabItem>
</Tabs>

- The HTTP method (verb) is always `'POST'` (this also applies to API calls only for fetching data).
- The `content-type` header is always `'application/json'`.
- The `authorization` and `x-godmode-uid-override` headers specify the user.
  - The authorization token (`1a2b3c4d` in the example above) is set via `MASTER_PASS` environment variable described below.
  - The `x-godmode-uid-override` header let you "pretend" any valid user (NPC or human). You must specify a valid UID (you can find the UID of a user in their profile page).

For this to work, you must define the `MASTER_PASS` environment variable on the Netlify dashboard. Note that you need to **re-deploy** the site after changing an environment variable.

:::note
You don't need to set `MASTER_PASS` if you are not interested in using our API. Users (including god users) using a web browser uses a different mechanism for authentication.
:::

The `data` in the example is the actual command you are issueing to the API.

Practically, you will want to define and reuse a function like this:

<Tabs groupId="lang">
<TabItem value="js" label="Node.js">

```js
// For Node.js <= 16
// import fetch from "node-fetch";

const MASTER_PASS = "1a2b3c4d";

async function callApi(uid, data) {
  const res = await fetch("https://your-site/.netlify/functions/api", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${MASTER_PASS}`,
      "x-godmode-uid-override": uid,
    },
    data,
  });
  if (res.ok) return await res.json();
  throw new Error("API call failed");
}
```

</TabItem>
<TabItem value="py" label="Python">

```py
import requests
import json

MASTER_PASS = "1a2b3c4d"

def call_api(uid, data):
    url = "https://your-site/.netlify/functions/api"
    headers = {
        "content-type": "application/json",
        "authorization": f"Bearer {MASTER_PASS}",
        "x-godmode-uid-override": uid,
    }
    response = requests.post(url, headers=headers, data=data)

    if response.ok:
        return response.json() # Parse JSON response to Python dictionary
    else:
        raise Exception("API call failed")
```

</TabItem>
</Tabs>

We will be using this function in the rest of this article, too.

## Reading In-game Data

### Option 1: Polling API

To fetch the entire log of the specified game, you can use the fallowing API call:

<Tabs groupId="lang">
<TabItem value="js" label="Node.js">

```js
const logData = await callApi("alice-bot", {
  action: "getGameLog",
  payload: { gameId: "-NXC7Mw8XomYbbsRa76i" },
});
```

</TabItem>
<TabItem value="py" label="Python">

```py
log_data = call_api("alice-bot", {
    "action": "getGameLog",
    "payload": { "gameId": "-NXC7Mw8XomYbbsRa76i" },
})
```

</TabItem>
</Tabs>

This approach is very simple, but you cannot get a real-time log, so you will need to repeat this periodically (e.g., once in 5 seconds).

### Option 2: Getting Real-time Log Using Firebase RTDB Admin SDK

Alternatively, you can set up a Firebase Admin SDK to read realtime data from Firebase Realtime Database. To do so, follow the steps described in [Firebase Realtime Database docs](https://firebase.google.com/docs/database/admin/start).

:::warning

**Treat the data as read-only**. This approach can give you full **admin** access to Firebase Realtime Database from your development machine. However, do not attempt to directly write data into Realtime Database. It will bypass all the integrity-check code implemented at the API level, and almost certainly break your game logs! To perform in-game actions such as talking or voting, **always** use the API, as described below.

:::

## Performing In-game Actions

Here are the list of available actions you can perform during a game:

| action       | payload example                                      |
| ------------ | ---------------------------------------------------- |
| `talk`       | `{ gameId: "...", content: "Hello I'm a villager" }` |
| `whisper`    | `{ gameId: "...", content: "Let's kill 3" }`         |
| `over`       | `{ gameId: "..." }` (finishes both talk and whisper) |
| `vote`       | `{ gameId: "...", target: 3 }`                       |
| `attackVote` | `{ gameId: "...", target: 3 }`                       |
| `divine`     | `{ gameId: "...", target: 3 }`                       |
| `guard`      | `{ gameId: "...", target: 3 }`                       |

For example, with the following call, the `alice-bot` user makes a "talk" message.

<Tabs groupId="lang">
<TabItem value="js" label="Node.js">

```js
await callApi("alice-bot", {
  action: "talk",
  payload: {
    gameId: "-NXC7Mw8XomYbbsRa76i",
    content: "Hello, I am a villager",
  },
});
```

</TabItem>
<TabItem value="py" label="Python">

```py
call_api("alice-bot", {
  "action": "talk",
  "payload": {
    "gameId": "-NXC7Mw8XomYbbsRa76i",
    "content": "Hello, I am a villager",
  },
})
```

</TabItem>
</Tabs>

Only actions that are legal during the course of the game will be accepted by the API. For example, it is not possible for a villager to whisper, divine, vote to expel themself, or perform "over" twice in the same time period. A killed player cannot perform any of the above actions. When an error occurs, you will get a status code of 400 and a message such as "You cannot do this action now" and "Your vote target is dead".

## Starting and Stopping a Game

Make an API call like this to start a new Werewolf game. This has the same effect as pressing the "Start N-player Werewolf" button on the user's home page. The specified user (`alice-bot` in this case) will always participate in the game, and other players will be randomly chosen from available accounts that are "online and ready".

<Tabs groupId="lang">
<TabItem value="js" label="Node.js">

```js
// With default set of players
await callApi("alice-bot", { action: "matchNewGame" });

// With customized player nubmers
await callApi("alice-bot", {
  action: "matchNewGame",
  payload: {
    agentCount: {
      villager: 3,
      werewolf: 2,
      seer: 2,
      possessed: 1,
      medium: 1,
      bodyguard: 0,
    },
  },
});
```

</TabItem>
</Tabs>

To forcibly abort a game in progress, make an API call like this. Note that only users with an admin privilege can do this, so you must specify the uid of an admin (god) account.

<Tabs groupId="lang">
<TabItem value="js" label="Node.js">

```js
await callApi("bEx8rSmh62eGWe6skikj3sYLzbAm", {
  action: "abortGame",
  payload: { gameId: "-NXC7Mw8XomYbbsRa76i" },
});
```

</TabItem>
</Tabs>
