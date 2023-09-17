import {
  DynamoDBClient,
  GetItemCommand,
  GetItemCommandInput,
  QueryCommand,
  QueryCommandInput,
} from '@aws-sdk/client-dynamodb';
import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';

import schema from './schema';

const client = new DynamoDBClient({});

const groupsTable = process.env.GROUPS_TABLE;
const imagesTable = process.env.IMAGES_TABLE;

const getImages: ValidatedEventAPIGatewayProxyEvent<
  typeof schema
> = async event => {
  console.log(event);

  const groupId = event.pathParameters.groupId;

  const validGroupId = await groupExists(groupId);

  if (!validGroupId) {
    return {
      statusCode: 404,
      body: JSON.stringify({
        error: 'Group does not exist.',
      }),
    };
  }

  const images = await getImagesPerGroup(groupId);

  return {
    statusCode: 200,
    body: JSON.stringify({
      items: images,
    }),
  };
};

async function groupExists(groupId: string) {
  const getItemParams: GetItemCommandInput = {
    TableName: groupsTable,
    Key: {
      id: {
        S: groupId,
      },
    },
  };
  const getItemCommand = new GetItemCommand(getItemParams);

  const result = await client.send(getItemCommand);

  return !!result.Item;
}

async function getImagesPerGroup(groupId: string) {
  const queryParams: QueryCommandInput = {
    TableName: imagesTable,
    KeyConditionExpression: 'groupId = :groupId',
    ExpressionAttributeValues: {
      ':groupId': {
        S: groupId,
      },
    },
    ScanIndexForward: false,
  };

  const queryCommand = new QueryCommand(queryParams);

  const result = await client.send(queryCommand);

  return result.Items.map(item => {
    const { imageId, title, groupId, timestamp } = item;

    return {
      imageId: imageId.S,
      title: title.S,
      groupId: groupId.S,
      timestamp: timestamp.S,
    };
  });
}

export const main = middyfy(getImages);
