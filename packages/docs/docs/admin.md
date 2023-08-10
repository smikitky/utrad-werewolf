---
sidebar_position: 4
---

# Administration

## User Management

### Two Types of Player Accounts

This app deals with several types of player accounts:

<div className="frame-box">
All user account
<div className="frame-box">
<strong>Human player account</strong>
<div className="frame-box">
Ordinary user
</div>
<div className="frame-box">
God (admin) user
</div>
</div>
<div className="frame-box">
<strong>NPC account (aka bot account)</strong>
</div>
</div>

---

A **human player account** is a _real_ account associated with a Google account or an e-mail address. It's created automatically when someone signs in with one of these authentication methods. These accounts will appear also on the "Authentication" section of the Firebase console.

An **non-player character (NPC) account** (aka "bot account") is a _virtual_ account you can create on God Mode. It is not associated with any sign-in method, so a real person cannot log-in with this type of account. NPCs can play Werewolf (with humans or other NPCs) by being controlled via God Mode or [via API](./bot).

:::info

Here is the overview of who can access which type of information. Firebase project admin is the person who set up the web app and the Firebase project. A God user refers to someone who has logged in to the web app and was granted God privilege from another God user.

| Item                       | Ordinary User | God User | Firebase Project Owner |
| -------------------------- | ------------- | -------- | ---------------------- |
| User's own game log        | Yes           | Yes      |
| User name of other players | Yes           | Yes      |
| Game log of other players  | With `gameId` | Yes      |
| Google Account Name        | No            | No       | Yes                    |
| User's email               | No            | No       | Yes                    |
| Google Account Password    | No            | No       | No                     |

:::

### Creating an NPC

To create an NPC account, visit God Mode and use the "Add NPC Account" box. The user ID can be any unique string containing only alphanumerical characters and `_`, `-` (e.g., "bot-alice", "NPC_15293").

### Removing Accounts

It is not possible to remove an account, but you can block individual users from logging in in the "Authentication" section of the Firebase console.

An ordinary user can see the complete log of **any** finished game (even if they were not participated in the game) if they know the `gameId` shown in the profile page.

## God Mode

In God Mode, an admin can do the following.

- View all users, including offline users
- Create an NPC account (see [Creating AI Bot to Drive NPC Accounts](./bot))
- View the complete log of all games stored in the database
- Completely delete any game log
- Download game logs
- Use an icon to categorize game logs
- Forcibly mark an account as "online/offline" or "ready/not ready"
- Assign another account as an admin

## Backups

You can download the entire database in JSON format from the Firebase Realtime Database console. Also, consider enabling backups. For more details, please refer to the Firebase documentation.
