import { FC, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { team, UserEntry, UserGameHistory } from './game-data';
import { roleTextMap, teamTextMap } from './game-utils';
import Icon from './Icon';
import formatDate from './utils/formatDate';
import { useApi } from './utils/useApi';
import useFirebaseSubscription from './utils/useFirebaseSubscription';
import { useLoginUser } from './utils/user';

const Profile: FC = () => {
  const uid = useParams().uid as string;
  const user = useFirebaseSubscription<UserEntry>(`/users/${uid}`);
  const loginUser = useLoginUser();
  const api = useApi();
  const userHistory = useFirebaseSubscription<UserGameHistory['a']>(
    `/userHistory/${uid}/`
  );
  const [editName, setEditName] = useState<string | null>(null);

  if (user.data === undefined) return null;
  const history = Object.entries(userHistory.data ?? {});

  const handleNameChange = async () => {
    if (loginUser.status !== 'loggedIn') return;
    setEditName(loginUser.data.name);
  };

  const commitNameChange = async () => {
    if (loginUser.status !== 'loggedIn') return;
    await api('setProfile', { name: editName });
    setEditName(null);
  };

  return (
    <StyledDiv>
      <h1>プロフィール</h1>
      <section>
        <h2>ユーザ情報</h2>
        <dl>
          <dt>ユーザ UID</dt>
          <dd>{uid}</dd>
          <dt>ユーザ名</dt>
          <dd>
            {editName === null ? (
              <>
                {user.data.name}
                {loginUser.status === 'loggedIn' && loginUser.uid === uid && (
                  <>
                    {' '}
                    <button onClick={handleNameChange}>ユーザ名変更</button>
                  </>
                )}
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  autoFocus
                />
                <button onClick={commitNameChange}>決定</button>
                <button onClick={() => setEditName(null)}>キャンセル</button>
              </>
            )}
          </dd>
          <dt>オンライン状況</dt>
          <dd>{user.data.onlineStatus ? 'オンライン' : 'オフライン'}</dd>
        </dl>
        <h2>プレイ履歴{userHistory.data && <> ({history.length}件)</>}</h2>
        <ul>
          {history.map(([gameId, entry]) => (
            <li key={gameId}>
              <Link to={`/game/${gameId}`}>
                <span className="date">
                  {formatDate(entry.finishedAt as number)}
                </span>{' '}
                <span className="role">{roleTextMap[entry.role]}</span>{' '}
                <span className="result">
                  {entry.wasAborted ? (
                    '(中断)'
                  ) : (
                    <>
                      {teamTextMap[entry.winner!]}勝利
                      {entry.winner === team(entry.role) ? (
                        <Icon icon="military_tech" />
                      ) : (
                        <Icon icon="mood_bad" />
                      )}
                    </>
                  )}
                </span>{' '}
                <span className="game-id">{gameId}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  section {
    padding: 10px;
  }
  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 10px 20px;
    dt {
      font-weight: bolder;
    }
    dd {
      margin: 0;
      padding: 0;
      display: flex;
      gap: 2px;
    }
  }
  ul li {
    list-style: disc;
    margin-left: 20px;
    a {
      text-decoration: none;
    }
    .role {
      font-size: 90%;
      display: inline-block;
      width: 70px;
      text-align: center;
      background: #eeddff;
      border-radius: 10px;
    }
    .game-id {
      color: gray;
      font-size: 80%;
    }
  }
`;

export default Profile;
