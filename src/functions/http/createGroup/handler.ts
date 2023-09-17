import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import schema from './schema';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const groupsTable = process.env.GROUPS_TABLE;

const createGroup: ValidatedEventAPIGatewayProxyEvent<
  typeof schema
> = async event => {
  const itemId = randomUUID();

  const { name, description } = event.body;

  const newItem = {
    id: itemId,
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
