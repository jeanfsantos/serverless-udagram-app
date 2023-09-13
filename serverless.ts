import type { AWS } from '@serverless/typescript';

// websocket
import connectHandler from '@functions/connectHandler';
import disconnectHandler from '@functions/disconnectHandler';

// http
import createGroup from '@functions/createGroup';
import createImage from '@functions/createImage';
import getGroups from '@functions/getGroups';
import getImage from '@functions/getImage';
import getImages from '@functions/getImages';
import hello from '@functions/hello';

// s3
import sendUploadNotifications from '@functions/sendUploadNotifications';

import { region } from '@libs/check-region';
import { stage } from '@libs/check-stage';
import { imageS3Bucket } from '@libs/s3-bucket';

const groupsTable = `Groups-${stage}`;
const imagesTable = `Images-${stage}`;
const imageIdIndex = 'imageIdIndex';
const connectionsTable = `Connections-${stage}`;

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
      IMAGE_ID_INDEX: imageIdIndex,
      IMAGE_S3_BUCKET: imageS3Bucket,
      SIGNED_URL_EXPIRATION: '300',
      REGION: region,
      CONNECTIONS_TABLE: connectionsTable,
      STAGE: stage,
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
        Action: ['dynamodb:Query', 'dynamodb:PutItem'],
        Resource: `arn:aws:dynamodb:${region}:*:table/${imagesTable}`,
      },
      {
        Effect: 'Allow',
        Action: ['dynamodb:Query'],
        Resource: `arn:aws:dynamodb:${region}:*:table/${imagesTable}/index/${imageIdIndex}`,
      },
      {
        Effect: 'Allow',
        Action: ['s3:PutObject', 's3:GetObject'],
        Resource: `arn:aws:s3:::${imageS3Bucket}/*`,
      },
      {
        Effect: 'Allow',
        Action: ['dynamodb:Scan', 'dynamodb:PutItem', 'dynamodb:DeleteItem'],
        Resource: `arn:aws:dynamodb:${region}:*:table/${connectionsTable}`,
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
            {
              AttributeName: 'imageId',
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
          GlobalSecondaryIndexes: [
            {
              IndexName: imageIdIndex,
              KeySchema: [
                {
                  AttributeName: 'imageId',
                  KeyType: 'HASH',
                },
              ],
              Projection: {
                ProjectionType: 'ALL',
              },
            },
          ],
          BillingMode: 'PAY_PER_REQUEST',
          TableName: imagesTable,
        },
      },
      ConnectionsDynamoDBTable: {
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
          TableName: connectionsTable,
        },
      },
      AttachmentsBucket: {
        Type: 'AWS::S3::Bucket',
        Properties: {
          BucketName: imageS3Bucket,
          NotificationConfiguration: {
            LambdaConfigurations: [
              {
                Event: 's3:ObjectCreated:*',
                Function: {
                  'Fn::GetAtt': [
                    'SendUploadNotificationsLambdaFunction',
                    'Arn',
                  ],
                },
              },
            ],
          },
          PublicAccessBlockConfiguration: {
            BlockPublicPolicy: false,
            RestrictPublicBuckets: false,
          },
          CorsConfiguration: {
            CorsRules: [
              {
                AllowedOrigins: ['*'],
                AllowedHeaders: ['*'],
                AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                MaxAge: 3000,
              },
            ],
          },
        },
      },
      BucketPolicy: {
        Type: 'AWS::S3::BucketPolicy',
        Properties: {
          PolicyDocument: {
            Id: 'MyPolicy',
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'PublicReadForGetBucketObjects',
                Effect: 'Allow',
                Principal: '*',
                Action: 's3:GetObject',
                Resource: `arn:aws:s3:::${imageS3Bucket}/*`,
              },
            ],
          },
          Bucket: {
            Ref: 'AttachmentsBucket',
          },
        },
      },
    },
  },
  // import the function via paths
  functions: {
    hello,
    getGroups,
    createGroup,
    getImages,
    getImage,
    createImage,
    sendUploadNotifications,
    connectHandler,
    disconnectHandler,
  },
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
