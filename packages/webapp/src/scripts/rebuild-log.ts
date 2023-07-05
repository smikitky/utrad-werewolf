import { config } from 'dotenv';
import fb from 'firebase-admin';
import * as path from 'path';
import {
  GameEntries,
  GlobalGameHistory,
  ResultLogEntry,
  UserGameHistory
} from '../game-data';

config({ path: path.join(__dirname, '../../.env') }); // Loads environment variables from .env file

if (!process.env.GCP_CREDENTIALS) throw new Error('GCP_CREDENTIALS is not set');
const credentials = JSON.parse(
  Buffer.from(process.env.GCP_CREDENTIALS, 'base64').toString()
);
fb.initializeApp({
  credential: fb.credential.cert(credentials),
  databaseURL: 'https://utrad-warewolf-default-rtdb.firebaseio.com/'
});
const db = fb.database();

const main = async () => {
  const ref = db.ref('/games');
  const snapshot = await ref.once('value');
  const data = snapshot.val() as GameEntries;
  const globalLog: GlobalGameHistory = {};
  const userLog: UserGameHistory = {};
  Object.entries(data).forEach(([gameId, game]) => {
    const { finishedAt, wasAborted } = game;
    const numAgents = game.agents.length;
    if (!finishedAt) return;
    const result = Object.values(game.log).find(
      l => l.type === 'result'
    ) as ResultLogEntry;
    const winner = result ? result.winner : undefined;

    globalLog[gameId] = {
      finishedAt,
      ...(wasAborted ? { wasAborted: true } : {}),
      numAgents,
      ...(winner ? { winner } : {})
    };
    game.agents.forEach(({ userId, role }) => {
      if (!userLog[userId]) userLog[userId] = {};
      userLog[userId][gameId] = {
        finishedAt,
        ...(wasAborted ? { wasAborted: true } : {}),
        numAgents,
        role,
        ...(winner ? { winner } : {})
      };
    });
  });
  await db.ref('/globalHistory').set(globalLog);
  await db.ref('/userHistory').set(userLog);
};

main()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
