import React, { ReactNode } from 'react';
import ReactDOM, { Root } from 'react-dom/client';
import { createGlobalStyle } from 'styled-components';
import Alert from './Alert ';

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    background: #eeeeee;
    font-family: sans-serif;
  }

  * {
    box-sizing: border-box;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    &.bullet {
      list-style: disc;
      margin-left: 1em;
    }
  }

  h1 {
    margin: 10px 0px 20px;
    font-size: 130%;
    padding-bottom: 3px;
    position: relative;
    &::before {
      content: '';
      position: absolute;
      left: 0;
      bottom: 0;
      width: 50%;
      height: 7px;
      background: linear-gradient(to right, #001284 50%, #ffffff);
    }
    &::after {
      content: '';
      position: absolute;
      left: 0;
      bottom: 0;
      width: 100%;
      height: 2px;
      background: #555555;
    }
  }

  h2 {
    width: 100%;
    display: flex;
    align-items: center;
    margin: 10px auto;
    font-size: 110%;
    gap: 10px;
    &::after {
      content: '';
      flex: 1;
      height: 0px;
      border-bottom: 2px solid silver;
    }
  }

  .material-icons {
    vertical-align: middle;
    font-size: 120%;
  }
`;

const configCheck = (): ReactNode => {
  if (typeof import.meta.env.FB_APP_CONFIG === 'undefined') {
    return (
      <>
        <code>FB_APP_CONFIG</code> environment variable is not set. Please set
        them in Netlify Dashboard. (Or if you are running the app locally, set
        them in <code>.env</code> file.)
      </>
    );
  }
  try {
    atob(import.meta.env.FB_APP_CONFIG);
  } catch (err: any) {
    return (
      <>
        Coult not parse <code>FB_APP_CONFIG</code> environment. It's not
        properly encoded in base64.
      </>
    );
  }
  try {
    JSON.parse(atob(import.meta.env.FB_APP_CONFIG));
  } catch (err: any) {
    return (
      <>
        Coult not parse <code>FB_APP_CONFIG</code> environment. The doceded
        string is not a valid JSON string.
      </>
    );
  }
  return 'null';
};

const main = async () => {
  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );

  const error = configCheck();
  if (error !== 'null') {
    root.render(
      <Alert>
        <div>{error}</div>
      </Alert>
    );
    return;
  }

  const App = (await import('./App')).default;
  root.render(
    <React.StrictMode>
      <GlobalStyle />
      <App />
    </React.StrictMode>
  );
};

main();
