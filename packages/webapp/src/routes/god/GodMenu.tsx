import Icon from '@/ui/Icon';
import { makeLangResource } from '@/ui/LangResource';
import Toggle from '@/ui/Toggle';
import useTitle from '@/utils/useTitle';
import withLoginBoundary from '@/withLoginBoundary';
import { FC, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const LangResource = makeLangResource({
  allUsers: { en: 'All Users', ja: '全ユーザー' },
  recentGames: { en: 'Recent Games', ja: '最近のゲーム' },
  settings: { en: 'Settings', ja: '設定' }
});

const GodMenu: FC = () => {
  useTitle('God Mode Menu');

  const location = useLocation();
  const navigate = useNavigate();

  const locations = ['all-users', 'all-games', 'settings'];
  const selected = locations.indexOf(
    location.pathname.split('/').at(-1) ?? 'all-users'
  );

  useEffect(() => {
    if (selected < 0) navigate('/god/all-users');
  }, [selected]);

  if (selected < 0) return null;

  const handleSelect = (index: number) => {
    navigate(locations[index]);
  };

  const choices = [
    <>
      <Icon icon="group" /> <LangResource id="allUsers" />
    </>,
    <>
      <Icon icon="history" /> <LangResource id="recentGames" />
    </>,
    <>
      <Icon icon="settings" /> <LangResource id="settings" />
    </>
  ];

  return (
    <StyledDiv>
      <h1>God Mode</h1>
      <Toggle choices={choices} value={selected} onChange={handleSelect} />
      <Outlet />
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  padding: 10px;
`;

export default withLoginBoundary({ mustBeGod: true })(GodMenu);
