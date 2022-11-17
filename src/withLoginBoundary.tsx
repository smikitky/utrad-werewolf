import { FC, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Alert from './Alert ';
import { LoggedInUser, useLoginUser } from './utils/user';

export type Page = FC<{
  loginUser: LoggedInUser;
}>;

export const withLoginBoundary = (options?: {
  mustBeGod?: boolean;
  redirect?: boolean;
}): ((page: Page) => FC) => {
  const { mustBeGod, redirect } = options ?? {};

  return Page => {
    return () => {
      const loginUser = useLoginUser();
      const navigate = useNavigate();

      useEffect(() => {
        if (loginUser.status === 'loggedOut' && redirect) navigate('/login');
      }, [loginUser]);

      if (loginUser.status === 'indeterminate') {
        return null;
      } else if (loginUser.status === 'loggedOut') {
        return (
          <div>
            <Alert>
              <Link to="/login">ログイン</Link>してください
            </Alert>
          </div>
        );
      } else {
        if (mustBeGod && !loginUser.data.canBeGod) {
          return (
            <div>
              <Alert>あなたは神にはなれません</Alert>
            </div>
          );
        }
        return <Page loginUser={loginUser} />;
      }
    };
  };
};

export default withLoginBoundary;
