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
Admin ("God") user
</div>
</div>
<div className="frame-box">
<strong>NPC account (aka bot account)</strong>
</div>
</div>

---

A **human player account** is a _real_ account associated with a Google account or an e-mail address. It's created automatically when someone signs in with one of these authentication methods. These accounts will appear also on the "Authentication" section of the Firebase console.

An **non-player character (NPC) account** is a _virtual_ account you can create on the admin screen. It is not associated with any sign-in method, so a real person cannot log-in with this type of account. NPCs can play Werewolf (with human players or other NPCs) either via God Mode or via API.

### Creating an NPC

To create an NPC account, visit God Mode and use the "Add NPC Account" box. The user ID can be any unique string containing only alphanumerical characters and `_`, `-` (e.g., "bot-alice", "-NPC_15293").

:::caution

- All account profiles, including their user names and play histories, are **public** to other players. Firebase project admins can see e-mails or Google account names (i.e., Gmail address) in Firebase cosole. However, security data such as Google account passwords are managed by Firebase itself, and even admins do not have access to them.

:::

### Removing Accounts

You can remove a user account when no play history is associated with the account.

## God Mode

In God Mode, an admin can do the following:

- Creating an NPC account
- Viewing all users, including offline users
- Viewing the complete game log of all games
- Download or delete game logs
