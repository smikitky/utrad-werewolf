import {
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithRedirect
} from 'firebase/auth';
import { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { auth, googleAuthProvider } from './utils/firebase.js';
import { useLoginUser } from './utils/user';

const LoginScreen: FC = () => {
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [mailSent, setMailSent] = useState(false);
  const loginUser = useLoginUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      setBusy(true);
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Please provide your email for confirmation');
      }
      // The client SDK will parse the code from the link for you.
      signInWithEmailLink(auth, email!, window.location.href)
        .then(result => {
          window.localStorage.removeItem('emailForSignIn');
          navigate('/');
        })
        .catch(error => {
          // Some error occurred, you can inspect the code: error.code
          // Common errors could be invalid email and invalid or expired OTPs.
        });
    }
  }, []);

  useEffect(() => {
    if (loginUser.status === 'loggedIn') {
      navigate('/');
    }
  }, [loginUser.status]);

  const handleGoogleLoginClick = async () => {
    setBusy(true);
    await signInWithRedirect(auth, googleAuthProvider);
  };

  const handleEmailLoginClick = async () => {
    setBusy(true);
    const actionCodeSettings = {
      url: window.location.href,
      handleCodeInApp: true
    };
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    localStorage.setItem('emailForSignIn', email);
    setMailSent(true);
  };

  if (loginUser.status === 'indeterminate') {
    return null;
  }

  return (
    <StyledDiv>
      <h1>UTRAD Werewolf</h1>
      <nav>
        <button onClick={handleGoogleLoginClick} disabled={busy}>
          Google アカウントでログイン
        </button>
        <hr />
        <input
          placeholder="メールアドレス"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <button onClick={handleEmailLoginClick} disabled={busy}>
          メールアドレスでログイン
        </button>
        {mailSent && (
          <p>
            メールを送信しました。メールに記載されたリンクをクリックしてください。
          </p>
        )}
      </nav>
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  nav {
    max-width: 500px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
`;

export default LoginScreen;
