import Alert from '@/ui/Alert ';
import { makeLangResource } from '@/ui/LangResource';
import { LoggedInUser, useLoginUser } from '@/utils/user';
import { FC, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export type Page = FC<{
  loginUser: LoggedInUser;
}>;

const LangResource = makeLangResource({
  notGod: { en: 'You are not a god', ja: 'あなたは神ではありません' }
});

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
              You must <Link to="/login">log in</Link> to view this page.
            </Alert>
          </div>
        );
      } else {
        if (mustBeGod && !loginUser.data.canBeGod) {
          return (
            <div>
              <Alert>
                <LangResource id="notGod" />
              </Alert>
            </div>
          );
        }
        return <Page loginUser={loginUser} />;
      }
    };
  };
};

export default withLoginBoundary;
