import { FC } from 'react';
import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { UserEntry, UserGameHistory } from './game-data';
import { roleTextMap, teamTextMap } from './game-utils';
import { useApi } from './utils/useApi';
import useFirebaseSubscription from './utils/useFirebaseSubscription';
import { useLoginUser } from './utils/user';

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString();
};

const Profile: FC = () => {
  const uid = useParams().uid as string;
  const user = useFirebaseSubscription<UserEntry>(`/users/${uid}`);
  const loginUser = useLoginUser();
  const api = useApi();
  const userHistory = useFirebaseSubscription<UserGameHistory['a']>(
    `/userHistory/${uid}/`
  );

  if (user.data === undefined) return null;
  const history = Object.entries(userHistory.data ?? {});

  const handleNameChange = async () => {
    if (loginUser.status !== 'loggedIn') return;
    const name = prompt('ユーザ名を入力してください', loginUser.data.name);
    if (name === null) return;
    await api('setProfile', { name });
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
            {user.data.name}
            {loginUser.status === 'loggedIn' && loginUser.uid === uid && (
              <>
                {' '}
                <button onClick={handleNameChange}>ユーザ名変更</button>
              </>
            )}
          </dd>
          <dt>オンライン状況</dt>
          <dd>{user.data.onlineStatus ? 'オンライン' : 'オフライン'}</dd>
        </dl>
        <h2>プレイ履歴{userHistory.data && <> ({history.length}件)</>}</h2>
        <ul>
          {history.map(([gameId, entry]) => (
            <li>
              <Link to={`/game/${gameId}`}>
                <span className="date">
                  {formatDate(entry.finishedAt as number)}
                </span>
                <span className="role">あなた：{roleTextMap[entry.role]}</span>
                <span className="result">
                  勝利：{teamTextMap[entry.winner!]}
                </span>
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
    }
  }
  ul li {
    list-style: disc;
    margin-left: 20px;
    a {
      text-decoration: none;
      display: flex;
      gap: 10px;
    }
    .game-id {
      color: gray;
      font-size: 80%;
    }
  }
`;

export default Profile;
