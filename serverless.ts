import type { AWS } from '@serverless/typescript';

import createGroup from '@functions/createGroup';
import getGroups from '@functions/getGroups';
import getImages from '@functions/getImages';
import hello from '@functions/hello';
import { region } from '@libs/check-region';
import { stage } from '@libs/check-stage';

const groupsTable = `Groups-${stage}`;
const imagesTable = `Images-${stage}`;

const serverlessConfiguration: AWS = {
  service: 'serverless-udagram-app',
  frameworkVersion: '3',
  plugins: ['serverless-esbuild'],
  provider: {
    name: 'aws',
    runtime: 'nodejs14.x',
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
      GROUPS_TABLE: groupsTable,
      IMAGES_TABLE: imagesTable,
    },
    region,
    stage,
    iamRoleStatements: [
      {
        Effect: 'Allow',
        Action: ['dynamodb:Scan', 'dynamodb:PutItem', 'dynamodb:GetItem'],
        Resource: `arn:aws:dynamodb:${region}:*:table/${groupsTable}`,
      },
      {
        Effect: 'Allow',
        Action: ['dynamodb:Query'],
        Resource: `arn:aws:dynamodb:${region}:*:table/${imagesTable}`,
      },
    ],
  },
  resources: {
    Resources: {
      GroupsDynamoDBTable: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          AttributeDefinitions: [
            {
              AttributeName: 'id',
              AttributeType: 'S',
            },
          ],
          KeySchema: [
            {
              AttributeName: 'id',
              KeyType: 'HASH',
            },
          ],
          BillingMode: 'PAY_PER_REQUEST',
          TableName: groupsTable,
        },
      },
      ImagesDynamoDBTable: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          AttributeDefinitions: [
            {
              AttributeName: 'groupId',
              AttributeType: 'S',
            },
            {
              AttributeName: 'timestamp',
              AttributeType: 'S',
            },
          ],
          KeySchema: [
            {
              AttributeName: 'groupId',
              KeyType: 'HASH',
            },
            {
              AttributeName: 'timestamp',
              KeyType: 'RANGE',
            },
          ],
          BillingMode: 'PAY_PER_REQUEST',
          TableName: imagesTable,
        },
      },
    },
  },
  // import the function via paths
  functions: { hello, getGroups, createGroup, getImages },
  package: { individually: true },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ['aws-sdk'],
      target: 'node14',
      define: { 'require.resolve': undefined },
      platform: 'node',
      concurrency: 10,
    },
  },
};

module.exports = serverlessConfiguration;
