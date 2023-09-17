import { CustomAuthorizerEvent, CustomAuthorizerResult } from 'aws-lambda';

import { verify } from 'jsonwebtoken';
import { JwtToken } from '../../../auth/JwtToken';

import middy from '@middy/core';
import secretsManager from '@middy/secrets-manager';

const secretId = process.env.AUTH_0_SECRET_ID;
const secretField = process.env.AUTH_0_SECRET_FIELD;

const auth0Authorizer = middy(
  async (
    event: CustomAuthorizerEvent,
    context: any,
  ): Promise<CustomAuthorizerResult> => {
    try {
      const decodedToken = verifyToken(
        event.authorizationToken,
        context.AUTH0_SECRET[secretField],
      );
      console.log('User was authorized');

      return {
        principalId: decodedToken.sub,
        policyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: 'execute-api:Invoke',
              Effect: 'Allow',
              Resource: '*',
            },
          ],
        },
      };
    } catch (e) {
      console.log('User was not authorized', e.message);

      return {
        principalId: 'user',
        policyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: 'execute-api:Invoke',
              Effect: 'Deny',
              Resource: '*',
            },
          ],
        },
      };
    }
  },
);

function verifyToken(authHeader: string, secret: string): JwtToken {
  if (!authHeader) {
    throw new Error('No authorization header');
  }

  if (!authHeader.toLocaleLowerCase().startsWith('bearer ')) {
    throw new Error('Invalid authorization header');
  }

  const split = authHeader.split(' ');
  const token = split[1];

  return verify(token, secret) as JwtToken;
}

auth0Authorizer.use(
  secretsManager({
    cacheExpiry: 60000,
    fetchData: {
      AUTH0_SECRET: secretId,
    },
    setToContext: true,
  }),
);

export const main = auth0Authorizer;
