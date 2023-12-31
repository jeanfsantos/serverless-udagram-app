import 'dotenv/config';

import type { AWS } from '@serverless/typescript';

// websocket
import connectHandler from '@functions/websocket/connectHandler';
import disconnectHandler from '@functions/websocket/disconnectHandler';

// http
import createGroup from '@functions/http/createGroup';
import createImage from '@functions/http/createImage';
import getGroups from '@functions/http/getGroups';
import getImage from '@functions/http/getImage';
import getImages from '@functions/http/getImages';
import hello from '@functions/http/hello';

// s3
import resizeImage from '@functions/s3/resizeImage';
import sendUploadNotifications from '@functions/s3/sendUploadNotifications';

// dynamodb stream
import elasticSearchSync from '@functions/dynamoDB/elasticSearchSync';

// auth
import auth0Authorizer from '@functions/auth/auth0Authorizer';
import Rs256Auth0Authorizer from '@functions/auth/rs256Auth0Authorizer';

import { region } from '@libs/check-region';
import { stage } from '@libs/check-stage';
import { imageS3Bucket, thumbnailS3Bucket } from '@libs/s3-bucket';
import { topicName } from '@libs/sns-topic';

const groupsTable = `Groups-${stage}`;
const imagesTable = `Images-${stage}`;
const imageIdIndex = 'imageIdIndex';
const connectionsTable = `Connections-${stage}`;
const auth0SecretId = `Auth0Secret-${stage}`;

const myIpAddress = process.env.MY_IP_ADDRESS;

if (!myIpAddress) {
  throw new Error('MY_IP_ADDRESS is required!');
}

const serverlessConfiguration: AWS = {
  service: 'serverless-udagram-app',
  frameworkVersion: '3',
  plugins: ['serverless-esbuild', 'serverless-dynamodb', 'serverless-offline'],
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
      TOPIC_NAME: topicName,
      THUMBNAIL_S3_BUCKET: thumbnailS3Bucket,
      AUTH_0_SECRET_ID: auth0SecretId,
      AUTH_0_SECRET_FIELD: 'auth0Secret',
      IS_OFFLINE: process.env.IS_OFFLINE,
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
        Action: ['s3:PutObject'],
        Resource: `arn:aws:s3:::${thumbnailS3Bucket}/*`,
      },
      {
        Effect: 'Allow',
        Action: ['dynamodb:Scan', 'dynamodb:PutItem', 'dynamodb:DeleteItem'],
        Resource: `arn:aws:dynamodb:${region}:*:table/${connectionsTable}`,
      },
      {
        Effect: 'Allow',
        Action: ['dynamodb:Scan', 'dynamodb:PutItem', 'dynamodb:DeleteItem'],
        Resource: `arn:aws:dynamodb:${region}:*:table/${connectionsTable}`,
      },
      {
        Effect: 'Allow',
        Action: ['es:ESHttpPut'],
        Resource: `arn:aws:es:${region}:*:domain/images-search-${stage}/*`,
      },
      {
        Effect: 'Allow',
        Action: ['secretsmanager:GetSecretValue'],
        Resource: {
          Ref: 'Auth0Secret',
        },
      },
      {
        Effect: 'Allow',
        Action: ['kms:Decrypt'],
        Resource: {
          'Fn::GetAtt': ['KMSKey', 'Arn'],
        },
      },
    ],
    httpApi: {
      authorizers: {
        auth0Authorizer: {
          type: 'request',
          functionName: 'auth0Authorizer',
        },
      },
    },
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
          StreamSpecification: {
            StreamViewType: 'NEW_IMAGE',
          },
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
        DependsOn: ['SNSTopicPolicy'],
        Properties: {
          BucketName: imageS3Bucket,
          NotificationConfiguration: {
            TopicConfigurations: [
              {
                Event: 's3:ObjectCreated:Put',
                Topic: {
                  Ref: 'ImagesTopic',
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
      ImagesSearch: {
        Type: 'AWS::Elasticsearch::Domain',
        Properties: {
          ElasticsearchVersion: '7.10',
          DomainName: `images-search-${stage}`,
          ElasticsearchClusterConfig: {
            DedicatedMasterEnabled: false,
            InstanceCount: '1',
            ZoneAwarenessEnabled: false,
            InstanceType: 't2.small.elasticsearch',
          },
          EBSOptions: {
            EBSEnabled: true,
            Iops: 0,
            VolumeSize: 10,
            VolumeType: 'gp2',
          },
          AccessPolicies: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: {
                  AWS: `*`,
                },
                Action: ['es:*'],
                Resource: {
                  'Fn::Sub': `arn:aws:es:${region}:*:domain/images-search-${stage}/*`,
                },
                Condition: {
                  IpAddress: {
                    'aws:SourceIp': `${myIpAddress}/32`,
                  },
                },
              },
            ],
          },
        },
      },
      ImagesTopic: {
        Type: 'AWS::SNS::Topic',
        Properties: {
          DisplayName: 'Image bucket topic',
          TopicName: topicName,
        },
      },
      SNSTopicPolicy: {
        Type: 'AWS::SNS::TopicPolicy',
        Properties: {
          PolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: {
                  AWS: '*',
                },
                Action: 'sns:Publish',
                Resource: {
                  Ref: 'ImagesTopic',
                },
                Condition: {
                  ArnLike: {
                    'AWS:SourceArn': `arn:aws:s3:::${imageS3Bucket}`,
                  },
                },
              },
            ],
          },
          Topics: [
            {
              Ref: 'ImagesTopic',
            },
          ],
        },
      },
      ThumbnailsBucket: {
        Type: 'AWS::S3::Bucket',
        Properties: {
          BucketName: thumbnailS3Bucket,
        },
      },
      KMSKey: {
        Type: 'AWS::KMS::Key',
        Properties: {
          Description: 'KMS key to encrypt Auth0 secret',
          KeyPolicy: {
            Version: '2012-10-17',
            Id: 'key-default-1',
            Statement: [
              {
                Sid: 'Allow administration of the key',
                Effect: 'Allow',
                Principal: {
                  AWS: {
                    'Fn::Join': [
                      ':',
                      [
                        'arn:aws:iam:',
                        {
                          Ref: 'AWS::AccountId',
                        },
                        'root',
                      ],
                    ],
                  },
                },
                Action: ['kms:*'],
                Resource: '*',
              },
            ],
          },
        },
      },
      KMSKeyAlias: {
        Type: 'AWS::KMS::Alias',
        Properties: {
          AliasName: `alias/auth0Key-${stage}`,
          TargetKeyId: {
            Ref: 'KMSKey',
          },
        },
      },
      Auth0Secret: {
        Type: 'AWS::SecretsManager::Secret',
        Properties: {
          Name: auth0SecretId,
          Description: 'Auth0 secret',
          KmsKeyId: {
            Ref: 'KMSKey',
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
    elasticSearchSync,
    resizeImage,
    auth0Authorizer,
    Rs256Auth0Authorizer,
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
    'serverless-offline': {
      httpPort: 3003,
    },
    'serverless-dynamodb': {
      stages: ['dev'],
      start: {
        port: 8000,
        docker: false,
        inMenory: true,
        migrate: true,
      },
    },
  },
};

module.exports = serverlessConfiguration;
