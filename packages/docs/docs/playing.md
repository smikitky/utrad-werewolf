---
sidebar_position: 5
---

# Playing Werewolf

## Starting a Game

You need at least 2 (preferably 5) accounts that are "online" and "ready" to start a Werewolf game.

- "Online" means the user is currently logged-in to the app and the browser tab is open. This status is automatically tracked by Firebase's [presence system](https://firebase.google.com/docs/database/web/offline-capabilities).
- "Ready" means the user indicates they are ready to play a game now. The user can toggle their "ready" status on the home screen.

The online and ready status of NPC accounts will be managed by an admin (god) user.

When enough players (human or NPC) are "ready", the "Start X-player Werefolf" button will be enabled. The player who pressed this button will always join the game. The other players will be randomly selected from the "ready" players. When a game starts, human players will be redirected to the game screen. Players not selected for the game will remain on the home screen. Two or more games can be running simultaneously.

By default, the game is played with 5 players (2 villagers, 1 werewolf, 1 seer, and 1 possessed). You can change this using the "Customize" box.

The roles and agent numbers of the players will be assigned randomly by the game server. (The person who pressed the start button will not necessarily become Agent\[1\].) A player cannot know which agent corresponds to which account. Players are expected to refer to each other using the agent numbers (e.g., "I think 3 is a werewolf").

## Game Screen

During a game, players will see a screen like this. They choose their next action at the bottom of the screen. The available actions are:

- **Talk**: All surviving players can do this during daytime, before a vote. Each player can do this up to 10 times per day.
- **Whisper**: Only werewolves can do this at night. Each player can do this up to 10 times per night.
- **Over**: This is to indicate your intention not to talk/whisper further any more at this time period. When all players who have the right to talk/whisper at this period have indicated "over", the game moves to the voting phase.
- **Vote**: Determines who the player wishes to expel from the village.
- **Attack Vote**: Determines who the player wishes to attack as a werewolf.
- **Divine**: Determines who to divine.
- **Guard**: Determines who to guard from werewolf attacks.

Only actions that are available according to the progress of the game will be displayed, so the user should not get lost.

When a player is killed, they can enter "spectator mode" and will be able to view all in-game information, including whispers and the roles of all players.

When the game is over, use the link on the left side of the menu bar to return to the home page.

## Regulation

### Available Roles

These six roles are available.

- Villeagers' side
  - Villeager (村人)
  - Seer (aka diviner, 占い師)
  - Bodyguard (aka hunter, 狩人)
  - Medium (霊媒師)
- Werewolves' side
  - Werewolf (人狼)
  - Posessed (aka betrayer, 裏切り者)

A game can be started with 2 to 15 players. However, if a game starts with too few players or too many werewolves, the game will end right after it starts. At least 5 players are required to play a meaningful game.

Our Werewolf game is basically based on Ai Werewolf Competition (hereafter, AIWolf regulation). However, there are a few notable differences.

- In AIWolf protocol, conversations happen "passively" with a turn-based approach (Java functions are called many times for each opportunity to talk or whisper). However, since such an approach is unrealistic in human-vs-human or human-vs-AI settings, each agent (human or AI) can actively talk or whisper at any time as long as they are allowed to do so. Still, the number of talks/whispers allowed in each phase is limited to 10.

- The intention to end a conversation ("over") is recorded as a distinct event from the statement itself.

- AIWolf protocol says it _is_ possible to vote an invalid agent (a dead agent or the voter themself) in daytime, in which case the vote will be treated as a random vote to one of the valid agents. In this game, an agent can only vote a valid agent (i.e., someone who is alive and not themself).

- Likewise, AIWolf protocol says it _is_ possible to attack-vote an invalid agent (a dead agent or other surviving werewolves), in which case the vote is ignored as a faulty ballot. This effectively means a werewolf can abstain from attack-voting intentionally if they really want to. In this game, this is not possible; all werewolves must attack-vote one of the valid agents (i.e., living agents who are not werewolves).

Despite these limitations, it is possible to convert our game log into an AIWolf log.

## Manage Game as a God

A God account can enter God mode for each game. To do this, click one of the active players in the "All Users" section, and select the "Go to Game" menu. In this screen, you can view and control everything in the game:

- View the _complete_ game log ("God log"), including whispers, roles, and divine/guard targets.
- View the _partial_ game log from the perspective of one of the participants.
- Perform any action described above on behalf of any account (including NPC _and human players_). If you wish, you can even completely control all the players alone.
- Forcibly abort the game if something went wrong.
- View logs for developers who want to build their own AI bot.
  - The **raw log** stored in the database
  - The **API log** the app uses under the hood to perform user actions

:::info

It is **allowed** to enter God mode while also participating in the same game as a player. This will spoil the game, but you may find this useful for research purposes. If you want to manage as God but also wishes to play fairly as a regular player with others, consider using two accounts.

:::
