import React from 'react';
import ReactDOM from 'react-dom/client';
import { createGlobalStyle } from 'styled-components';
import App from './App';

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    background: #eeeeee;
  }

  * {
    box-sizing: border-box;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  h1 {
    margin: 10px 0px;
    padding: 5px;
    font-size: 120%;
    position: relative;
    &::after {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 5px;
      content: '';
      background-image: repeating-linear-gradient(-45deg, #000, #000 1px, transparent 2px, transparent 5px);
      background-size: 7px 7px;
    }
  }

  h2 {
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
  }
`;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <GlobalStyle />
    <App />
  </React.StrictMode>
);
