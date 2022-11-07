import {
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup
} from 'firebase/auth';
import { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { auth, googleAuthProvider } from './utils/firebase.js';
import { useApi } from './utils/useApi.js';
import { useLoginUser } from './utils/user';

const LoginScreen: FC = () => {
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [mailSent, setMailSent] = useState(false);
  const api = useApi();
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
    if (loginUser.status === 'loggedIn') navigate('/');
  }, [loginUser.status]);

  const handleGoogleLoginClick = async () => {
    setBusy(true);
    await signInWithPopup(auth, googleAuthProvider);
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
      <section>
        <button onClick={handleGoogleLoginClick} disabled={busy}>
          Google アカウントでログイン
        </button>
      </section>
      <section>
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
      </section>
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  section {
    width: 350px;
    max-width: 100%;
    margin: 15px auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: #eeeeff;
    border-radius: 5px;
    padding: 15px;
  }
`;

export default LoginScreen;
