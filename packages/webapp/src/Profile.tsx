import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';
import Icon from './Icon';
import { BasicLangResource, makeLangResource } from './LangResource';
import LangSwitch from './LangSwitch';
import RoleDisplay, { TeamDisplay } from './RoleDisplay';
import { UserEntry, UserGameHistory, team } from './game-data';
import formatDate from './utils/formatDate';
import { useApi } from './utils/useApi';
import useFirebaseSubscription from './utils/useFirebaseSubscription';
import useTitle from './utils/useTitle';
import withLoginBoundary, { Page } from './withLoginBoundary';
import { Lang } from './game-utils';
import Alert from './Alert ';

const LangResource = makeLangResource({
  userInformation: { en: 'User Information', ja: 'ユーザ情報' },
  userUid: { en: 'User ID', ja: 'ユーザ UID' },
  userName: { en: 'User Name', ja: 'ユーザ名' },
  changeUserName: { en: 'Change User Name', ja: 'ユーザ名を変更' },
  language: { en: 'Language', ja: '使用言語' },
  onlineStatus: { en: 'Online Status', ja: 'オンライン状況' },
  playHistory: { en: 'Play History', ja: 'プレイ履歴' },
  items: { en: 'Items', ja: '件' },
  aborted: { en: '(Aborted)', ja: '(中断)' },
  won: { en: ' Won', ja: '勝利' },
  godModeAlert: {
    en: 'As an admin, you can edit this user profile.',
    ja: '管理者はこのユーザのプロフィールを編集できます。'
  }
});

const Profile: Page = ({ loginUser }) => {
  const uid = useParams().uid as string;
  const user = useFirebaseSubscription<UserEntry>(`/users/${uid}`);
  const api = useApi();
  const userHistory = useFirebaseSubscription<UserGameHistory['a']>(
    `/userHistory/${uid}/`
  );
  const [editName, setEditName] = useState<string | null>(null);

  const profileEditable =
    loginUser.status === 'loggedIn' &&
    (loginUser.uid === uid || loginUser.data.canBeGod);

  const history = useMemo(
    () =>
      Object.entries(userHistory.data ?? {}).sort(
        (a, b) => (b[1].finishedAt as number) - (a[1].finishedAt as number)
      ),
    [userHistory.data]
  );

  useTitle('Profile');

  if (user.data === undefined) return null;

  const handleNameChange = async () => {
    setEditName(user.data!.name);
  };

  const commitNameChange = async () => {
    await api('setProfile', { target: uid, updates: { name: editName } });
    setEditName(null);
  };

  const handleUserLangChange = async (selection: Lang) => {
    await api('setProfile', { target: uid, updates: { lang: selection } });
  };

  return (
    <StyledDiv>
      <h1>
        <BasicLangResource id="profile" />
      </h1>
      {profileEditable && uid !== loginUser.uid && (
        <Alert variation="info">
          <LangResource id="godModeAlert" />
        </Alert>
      )}
      <section>
        <h2>
          <LangResource id="userInformation" />
        </h2>
        <dl>
          <dt>
            <LangResource id="userUid" />
          </dt>
          <dd>{uid}</dd>
          <dt>
            <LangResource id="userName" />
          </dt>
          <dd>
            {editName === null ? (
              <>
                {user.data.name}
                {profileEditable && (
                  <>
                    <button onClick={handleNameChange}>
                      <LangResource id="changeUserName" />
                    </button>
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
                <button onClick={commitNameChange}>
                  <BasicLangResource id="ok" />
                </button>
                <button onClick={() => setEditName(null)}>
                  <BasicLangResource id="cancel" />
                </button>
              </>
            )}
          </dd>
          <dt>
            <LangResource id="language" />
          </dt>
          <dd>
            {profileEditable ? (
              <LangSwitch
                value={user.data.lang ?? 'en'}
                onChange={handleUserLangChange}
                disabled={false}
              />
            ) : (
              <BasicLangResource id={user.data.lang ?? 'en'} />
            )}
          </dd>
          <dt>
            <LangResource id="onlineStatus" />
          </dt>
          <dd>
            {user.data.onlineStatus ? (
              <BasicLangResource id="online" />
            ) : (
              <BasicLangResource id="offline" />
            )}
          </dd>
        </dl>
        <h2>
          <LangResource id="playHistory" />
          {userHistory.data && (
            <>
              {' '}
              ({history.length} <LangResource id="items" />)
            </>
          )}
        </h2>
        <ul>
          {history.map(([gameId, entry]) => (
            <li key={gameId}>
              <Link to={`/game/${gameId}`}>
                <span className="date">
                  {formatDate(entry.finishedAt as number)}
                </span>{' '}
                <span className="num-agents">{entry.numAgents}P</span>{' '}
                <span className="role">
                  <RoleDisplay role={entry.role} />
                </span>{' '}
                <span className="result">
                  {entry.wasAborted ? (
                    <LangResource id="aborted" />
                  ) : (
                    <>
                      {<TeamDisplay team={entry.winner!} />}
                      <LangResource id="won" />
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
  padding: 10px;
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
      gap: 8px;
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
      width: 80px;
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

export default withLoginBoundary()(Profile);
