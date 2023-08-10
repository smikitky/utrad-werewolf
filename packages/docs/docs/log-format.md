---
sidebar_position: 7
---

# Log Format

This page describes the log format we use to keep track of the progress of a game. The basic terminology follows the AIWolf regulation (e.g., using "possessed" instead of "betrayer"), but we have introduced some differences to accommodate human-to-human games.

The biggest difference is that the log data is stored in JSON format.

```json
{
  "agents": [
    {
      "agentId": 1,
      "life": "dead",
      "name": "Agent[1]",
      "role": "werewolf",
      "userId": "user-uid-abc"
    },
    {
      "agentId": 2,
      "life": "alive",
      "name": "Agent[2]",
      "role": "seer",
      "userId": "user-uid-def"
    },
    {
      "agentId": 3,
      "life": "alive",
      "name": "Agent[3]",
      "role": "villager",
      "userId": "user-uid-ghi"
    },
    {
      "agentId": 4,
      "life": "alive",
      "name": "Agent[4]",
      "role": "possessed",
      "userId": "user-uid-jkl"
    },
    {
      "agentId": 5,
      "life": "alive",
      "name": "Agent[5]",
      "role": "villager",
      "userId": "user-uid-mno"
    }
  ],
  "finishedAt": 1688975425332,
  "log": {
    "-NZylPZ737hhGxm94jjk": {
      "agents": [
        {
          "agentId": 1,
          "life": "alive"
        },
        {
          "agentId": 2,
          "life": "alive"
        },
        {
          "agentId": 3,
          "life": "alive"
        },
        {
          "agentId": 4,
          "life": "alive"
        },
        {
          "agentId": 5,
          "life": "alive"
        }
      ],
      "day": 0,
      "event": "periodStart",
      "period": "night",
      "timestamp": 1688975288618,
      "type": "status",
      "votePhase": "chat"
    },
    "-NZylPZ8qSYQXjNTImpN": {
      "agents": [
        {
          "agentId": 1,
          "life": "alive"
        },
        {
          "agentId": 2,
          "life": "alive"
        },
        {
          "agentId": 3,
          "life": "alive"
        },
        {
          "agentId": 4,
          "life": "alive"
        },
        {
          "agentId": 5,
          "life": "alive"
        }
      ],
      "day": 0,
      "event": "voteSettle",
      "period": "night",
      "timestamp": 1688975288618,
      "type": "status",
      "votePhase": "settled"
    },
    "-NZylVj10s6quN5VT2ls": {
      "agent": 2,
      "target": 1,
      "timestamp": 1688975313908,
      "type": "divine"
    },
    "-NZylVj10s6quN5VT2lt": {
      "agents": [
        {
          "agentId": 1,
          "life": "alive"
        },
        {
          "agentId": 2,
          "life": "alive"
        },
        {
          "agentId": 3,
          "life": "alive"
        },
        {
          "agentId": 4,
          "life": "alive"
        },
        {
          "agentId": 5,
          "life": "alive"
        }
      ],
      "day": 1,
      "event": "periodStart",
      "period": "day",
      "timestamp": 1688975313908,
      "type": "status",
      "votePhase": "chat"
    },
    "-NZylVj2Ix1u9XU9N4_B": {
      "agent": 2,
      "target": 1,
      "timestamp": 1688975313908,
      "type": "divineResult"
    },
    "-NZylcvSgiD9fHfmldMi": {
      "agent": 2,
      "content": "Wow, 1 is a werewolf!",
      "timestamp": 1688975347469,
      "type": "talk"
    },
    "-NZylhTIs_TUWbeK7lpJ": {
      "agent": 1,
      "chatType": "talk",
      "timestamp": 1688975366091,
      "type": "over"
    },
    "-NZyliTpaFdzcXlgwCjB": {
      "agent": 2,
      "chatType": "talk",
      "timestamp": 1688975370203,
      "type": "over"
    },
    "-NZylj4dsOHtU3LY-RRI": {
      "agent": 3,
      "chatType": "talk",
      "timestamp": 1688975372683,
      "type": "over"
    },
    "-NZyljdXE5x_7Pem75zu": {
      "agent": 4,
      "chatType": "talk",
      "timestamp": 1688975374981,
      "type": "over"
    },
    "-NZylkgZ1uG7JITd3gdS": {
      "agent": 5,
      "chatType": "talk",
      "timestamp": 1688975379272,
      "type": "over"
    },
    "-NZylkgZ1uG7JITd3gdT": {
      "agents": [
        {
          "agentId": 1,
          "life": "alive"
        },
        {
          "agentId": 2,
          "life": "alive"
        },
        {
          "agentId": 3,
          "life": "alive"
        },
        {
          "agentId": 4,
          "life": "alive"
        },
        {
          "agentId": 5,
          "life": "alive"
        }
      ],
      "day": 1,
      "event": "voteStart",
      "period": "day",
      "timestamp": 1688975379272,
      "type": "status",
      "votePhase": 1
    },
    "-NZyln8ZR-sJF5KUjpBH": {
      "agent": 1,
      "target": 2,
      "timestamp": 1688975389319,
      "type": "vote",
      "votePhase": 1
    },
    "-NZyltENcp-9lHtJZdsb": {
      "agent": 2,
      "target": 1,
      "timestamp": 1688975414268,
      "type": "vote",
      "votePhase": 1
    },
    "-NZylu96s4fMztZClrba": {
      "agent": 3,
      "target": 1,
      "timestamp": 1688975418027,
      "type": "vote",
      "votePhase": 1
    },
    "-NZylv3PV9s6MBtKwckk": {
      "agent": 4,
      "target": 5,
      "timestamp": 1688975423211,
      "type": "vote",
      "votePhase": 1
    },
    "-NZylvwDFfuApNx1BED3": {
      "agent": 5,
      "target": 4,
      "timestamp": 1688975425332,
      "type": "vote",
      "votePhase": 1
    },
    "-NZylvwE7FDoyhAVRos3": {
      "agents": [
        {
          "agentId": 1,
          "life": "alive"
        },
        {
          "agentId": 2,
          "life": "alive"
        },
        {
          "agentId": 3,
          "life": "alive"
        },
        {
          "agentId": 4,
          "life": "alive"
        },
        {
          "agentId": 5,
          "life": "alive"
        }
      ],
      "day": 1,
      "event": "voteSettle",
      "period": "day",
      "timestamp": 1688975425332,
      "type": "status",
      "votePhase": "settled"
    },
    "-NZylvwE7FDoyhAVRos4": {
      "target": 1,
      "timestamp": 1688975425332,
      "type": "execute"
    },
    "-NZylvwF0ykGqF1syd_F": {
      "agents": [
        {
          "agentId": 1,
          "life": "dead"
        },
        {
          "agentId": 2,
          "life": "alive"
        },
        {
          "agentId": 3,
          "life": "alive"
        },
        {
          "agentId": 4,
          "life": "alive"
        },
        {
          "agentId": 5,
          "life": "alive"
        }
      ],
      "day": 1,
      "event": "periodStart",
      "period": "night",
      "timestamp": 1688975425332,
      "type": "status",
      "votePhase": "chat"
    },
    "-NZylvwF0ykGqF1syd_G": {
      "survivingVillagers": 4,
      "survivingWerewolves": 0,
      "timestamp": 1688975425332,
      "type": "result",
      "winner": "villagers"
    }
  },
  "startedAt": 1688975288618,
  "status": {
    "day": 1,
    "period": "night",
    "votePhase": "chat"
  },
  "winner": "villagers"
}
```

The log data is a large JSON object that hold the following as the top-most keys:

## Top-level Keys

- `agents`: The basic information about each player, including their current survival status. When the game has been finished, contains the final status.
- `startedAt`: Contains the timestamp of when the game started.
- `finishedAt`: Contains the timestamp if this game has been finished (either successfully or forcibly).
- `abortedAt`: Contains the timestamp if this game was forcibly aborted by a God user.
- `status`: An object that contains the current status of the game (if the game is finished, contains the final status).
  - `day`: The day number. It starts with 0
  - `period`: Either `"daytime"` or `"night"`.
  - `votePhase`: One of `"chat"`, `1` or `2`.
- `log`: The game log. See below.
- `winner`: When this game is finished successfully, contains the winner. Either `"villagers"` or `"werewolves"`.

All time data are stored as time since the Unix epoch, in milliseconds.

## Game Logs

The `log` data is a large JSON object that basically looks like this:

```json
{
  "log": {
    // highlight-next-line
    "-NZylcvSgiD9fHfmldMi": {
      "type": "<log type string>",
      "timestamp": 1688975347469
      // other data for this log type
    },
    // highlight-next-line
    "-NZylhTIs_TUWbeK7lpJ": {
      "type": "<log type string>",
      "timestamp": 1688975366091
      // other data for this log type
    }
    // other log entries
  }
}
```

The keys like `-NZylcvSgiD9fHfmldMi` is an auto-generated ID of the log entry. Each log entry at least has `"type"` and `"timestamp"`. Each log entry roughly corresponds to one entry of the game viewer you can see on a browser.

<details>
<summary>Be mindful of key order when using languages other than JavaScript/Python</summary>

The entries in the `"log"` object will arrive from the API in chronological order, but some languages may not preserve the key order of the `"log"` object when parsing JSON into their language-specific map/dictionary types. If you need to sort log data in chronological order, **sort _keys_ alphabetically** rather than _timestamps_. When multiple entries are logged in a single API call, their timestamps will have identical values. In the example above, notice how the last vote log and the "voteSettled" event log immediately after it have the same timestamp (`1688975425332`). If you use timestamps for sorting, there is a risk that the order will not be preserved.

In Python &ge; 3.7 and recent versions of JavaScript, the key order is guaranteed to be preserved, so it is safe to iterate over log entries like `for (const entry of Object.values(log))` (JavaScript) or `for entry in log.values()` (Python).

</details>

Here is the list of possible log types.

<!-- prettier-ignore -->
| Log type | Description |
| - | - |
| `status` | Each time the game "phase" progresses, this log will be output, along with the "phase" data (`day`, `period` and `votePhase`) and the current status of all agents. The `event` property contains what caused this log entry. |
| `divine` | Contains which seer (`agent`) decided to divine who (`target`). Should be visible to the agent only. |
| `divineResult` | Output when a seer's ability took effect on the `target`. Should be visible to the agent only. |
| `guard` | Contains which bodyguard (`agent`) decided to guard who (`target`). Should be visible to the agent only. |
| `guardResult` | Output when a bodyguard's ability took effect on the `target`. Should be visible to the agent only. |
| `mediumResult` | Output when a medium's ability took effect on someone (`target`). Should be visible to the agent only. |
| `talk` | Contains who (`agent`) said what (`content`). |
| `whisper` | Contains who (`agent`) said what (`content`). Should be visible to werewolves only. |
| `over` | Contains who (`agent`) indicated this. Should be visible to people who can talk or whisper at the current period. |
| `vote` | Contains who (`agent`) voted on who (`target`). The agent can be visible to all players, but not target. |
| `attackVote` | Contains who (`agent`) voted on who (`target`). The agent can be visible to werewolves, but not target. |
| `execute` | Contains who (`target`) was expeled from the village. |
| `attack` | Contains who (`target`) was killed by werewolves. `target` can be `'NOBODY'` when a guard protected the target. `intendedTarget` always contains the agent werewolves tried to attack. |
| `result` | Output only at the end of the game. Contains the number of survivors of the villagers' side (`survivingVillagers`) and that of the werewolves side (`survivingWerewolves`), and which team won (`winner`). |

## TypeScript Definition

The TypeScript definition of this log format can be found in `src/game-data.ts`.

## Log Conversion

The log data described in this article is a "complete" log containing all the information stored on the database. However, each agent playing the game needs to be able to see only the information that pertains to themselves. Currently, we do not provide a function/method to automatically generate a "personal" log from a complete log.
