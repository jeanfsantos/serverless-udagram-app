import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import { getUserId } from 'src/auth/utils';
import { dynamodbClientOptions } from 'src/config/dynamodbClientOptions';
import schema from './schema';

const client = new DynamoDBClient(dynamodbClientOptions);
const docClient = DynamoDBDocumentClient.from(client);
const groupsTable = process.env.GROUPS_TABLE;

const createGroup: ValidatedEventAPIGatewayProxyEvent<
  typeof schema
> = async event => {
  const itemId = randomUUID();

  const { name, description } = event.body;
  const authorization = event.headers.Authorization;
  const split = authorization.split(' ');
  const jwtToken = split[1];

  const newItem = {
    id: itemId,
    userId: getUserId(jwtToken),
    name,
    description,
  };

  const command = new PutCommand({
    TableName: groupsTable,
    Item: newItem,
  });

  await docClient.send(command);

  return {
    statusCode: 201,
    body: JSON.stringify(newItem),
  };
};

export const main = middyfy(createGroup);
