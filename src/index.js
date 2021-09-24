import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import Amplify from 'aws-amplify';
import config from "./aws-exports";
import { Layout } from 'antd';

Amplify.configure(config);

const { Footer, Content } = Layout;

ReactDOM.render(
  <React.StrictMode>
    <Layout className="layout">
      <Content>
        <App />
      </Content>
      <Footer style={{ textAlign: 'center' }}>©2021 Created by AWS</Footer>
    </Layout>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
