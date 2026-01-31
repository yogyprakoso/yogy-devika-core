import React, { useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { Authenticator } from '@aws-amplify/ui-react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import {
  createRequestHandler,
  getRequestHandler,
} from '@baseline/client-api/request-handler';
import { AxiosRequestConfig } from 'axios';
import '@aws-amplify/ui-react/styles.css';
import Home from './pages/Home';
import Room from './pages/Room';
import './index.scss';

Amplify.configure({
  Auth: {
    Cognito: {
      signUpVerificationMethod: 'code',
      identityPoolId: `${process.env.REACT_APP_COGNITO_IDENTITY_POOL_ID}`,
      userPoolId: `${process.env.REACT_APP_COGNITO_USER_POOL_ID}`,
      userPoolClientId: `${process.env.REACT_APP_COGNITO_USER_POOL_WEB_CLIENT_ID}`,
      loginWith: {
        email: true,
      },
    },
  },
});

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/room/:roomCode', element: <Room /> },
]);

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await fetchAuthSession();
        if (session?.tokens?.idToken) {
          setIsAuthenticated(true);
          if (!getRequestHandler()) {
            createRequestHandler(
              async (config: AxiosRequestConfig): Promise<AxiosRequestConfig> => {
                const authSession = await fetchAuthSession();
                if (!config.headers) config.headers = {};
                config.headers.Authorization = `Bearer ${authSession?.tokens?.idToken?.toString()}`;
                return config;
              },
            );
          }
        }
      } catch {
        // Not authenticated - expected on first load
      } finally {
        setIsLoading(false);
      }
    };

    void checkAuth();

    return Hub.listen('auth', (data) => {
      if (data.payload.event === 'signedIn') {
        setIsAuthenticated(true);
        window.location.reload();
      } else if (data.payload.event === 'signedOut') {
        setIsAuthenticated(false);
      }
    });
  }, []);

  if (isLoading) {
    return (
      <div className="loading-container">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="auth-container">
        <h1>Scrum Poker</h1>
        <p>Sign in to create or join a room</p>
        <Authenticator
          signUpAttributes={['email']}
          loginMechanisms={['email']}
          initialState="signIn"
        />
      </div>
    );
  }

  return <RouterProvider router={router} />;
};

export default App;
