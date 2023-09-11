import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import schema from './schema';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const imagesTable = process.env.IMAGES_TABLE;

const createImage: ValidatedEventAPIGatewayProxyEvent<
  typeof schema
> = async event => {
  const groupId = event.pathParameters.groupId;
  const { title } = event.body;
  const imageId = randomUUID();
  const timestamp = String(new Date().getTime());

  const newItem = {
    groupId,
    timestamp,
    imageId,
    title,
  };

  const command = new PutCommand({
    TableName: imagesTable,
    Item: newItem,
  });

  await docClient.send(command);

  return formatJSONResponse(newItem);
};

export const main = middyfy(createImage);
