---
sidebar_position: 2
---

# Online Demo

Here is the URL of the demo site:

<div className="big-link">

[https://werewolf-demo-2p8r3o.netlify.app/](https://werewolf-demo-2p8r3o.netlify.app/)

</div>

After logging-in, you can try the following:

- [Visit God Mode](https://werewolf-demo-2p8r3o.netlify.app/god)
- See game logs as a God user ([example](https://werewolf-demo-2p8r3o.netlify.app/god/-NFwt6NTTsR2qgJ0OrVR))
- Start a new game from the [Home screen](https://werewolf-demo-2p8r3o.netlify.app/). Users with a robot icon are bot (NPC) users, so they won't do anything unless you control them in God Mode. Open a god mode, click one of the users playing a game (yellow), and select "Go to game". (Don't forget to finish or abort the game!)

## Automatic Admin Privilege

On the demo site, when you first log-in, you are automatically granted the administrator (God) privilege. You will see the "God Mode" menu on the top navigation bar. This means that everyone is able to view all logs, delete them, enter God mode, and freely control other players.

However, to maintain minimum functionality, even administrators are not allowed to do the following. Attempts to do so will result in an API error.

- You cannot change the profile of other players, including their user name.
- You cannot add new NPC accounts.
- You cannot delete protected game logs created in 2022.

## Terms of Use for the Demo Site

Before accessing the demo site, please agree to the following:

- If you sign up for the demo site, we will have access to your Gmail account name or email address. We will not use this information for any purpose.
- The demo site should only be used to evaluate the functionality of our project. [Set up your own site](./install) for actual AI development or storing large amounts of data.
- The user name and the game logs you create on the demo site will be visible to other users. Do not post any personal information (such as your real name) or inappropriate remarks.
- Since everyone will have the admin privilege, other users may (accidentally or intentionally) abort your game or use God mode to play games pretending you.
- Your game logs may be deleted without notice.
