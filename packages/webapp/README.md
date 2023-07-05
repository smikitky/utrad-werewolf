# UTRAD-Werewolf: Web Jinro Client

This is a web app where humans and AI can play Werewolf game online. The game rule is roughly based on the [Aiwolf regulation](http://aiwolf.org/en/aiwolf_contest), with some notable exceptions described later. You can use this app to:

- Make humans play werewolf games based on Aiwolf rules in order to collect natural language playlogs for use in machine learning
- Allow human to play with AI (possibly hiding AI's identity)
- Offer a place for AI-vs-AI games in natural language

## Starting the Dev Server

This project is intended to be deployed using the following two famous web hosting platforms:

- [Firebase](https://firebase.google.com/): uses Authentication and Realtime Database
- [Netlify](https://www.netlify.com/): uses online build and functions

1. Install the lastest Node.js and NPM.

2. Execute the following command to clone the repository and install dependencies.

   ```
   git clone git@github.com:smikitky/jinro.git
   cd jinro
   npm ci
   ```

3. Make a gitignore'd file named `.env` to save your secret.

4. Run `npm run dev` to open a development server.

## Difference from the Official Aiwolf Regulation

The Werewolf game you can play with this app is based on the official Aiwolf regulation, but there are some differences.

- In Aiwolf protocol, conversations happen "passively" with a turn-based approach (Java functions are called many times for each opportunity to talk or whisper). However, since such an approach is unrealistic in human-vs-human or human-vs-AI settings, each agent (human or AI) can actively talk or whisper at any time as long as they are allowed to do so. Still, the number of talks/whispers allowed in each phase is limited to 10.

- The intention to end a conversation ("over") is recorded as a distinct event from the statement itself.

- Aiwolf protocol says it _is_ possible to vote an invalid agent (a dead agent or the voter themself) in daytime, in which case the vote will be treated as a random vote to one of the valid agents. In this game, an agent can only vote a valid agent (i.e., someone who is alive and not themself).

- Likewise, Aiwolf protocol says it _is_ possible to attack-vote an invalid agent (a dead agent or an agent known to be a werewolf), in which case the vote is ignored as a faulty ballot. This effectively means a werewolf can abstain from attack-voting intentionally if they really want to. In this game, this is not possible; all werewolves must attack-vote one of the valid agents (i.e., living agents who are not werewolves).

## Limitations

**IMPORTANT**: This application is not intended to be accessed by a large number of unspecified users. It should only be used within a small group.
