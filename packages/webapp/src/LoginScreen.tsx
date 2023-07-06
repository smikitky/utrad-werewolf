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
import Alert from './Alert .js';

const LoginScreen: FC = () => {
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [mailSent, setMailSent] = useState(false);
  const [isApiWorking, setIsApiWorking] = useState<boolean | '?'>('?');
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
    (async () => {
      if (isApiWorking === '?') {
        const res = await fetch('/.netlify/functions/api', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'ping' })
        });
        setIsApiWorking(res.ok);
      }
    })();
  }, [isApiWorking]);

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
      {isApiWorking === false && (
        <Alert>
          <div>
            The Werewolf API seems to be not working. If you are an
            administrator, ensure you have correctly finished the setup process.
          </div>
        </Alert>
      )}
      <section>
        <button onClick={handleGoogleLoginClick} disabled={busy}>
          Login with Google Account
        </button>
      </section>
      <section>
        <input
          placeholder="E-mail address"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <button onClick={handleEmailLoginClick} disabled={busy}>
          Login with E-mail Address
        </button>
        {mailSent && (
          <p>
            An e-mail was sent to the specified address. Please click the link
            in the mail.
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
