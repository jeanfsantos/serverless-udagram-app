import {
  DynamoDBClient,
  QueryCommand,
  QueryCommandInput,
} from '@aws-sdk/client-dynamodb';
import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';

import schema from './schema';
import { dynamodbClientOptions } from 'src/config/dynamodbClientOptions';

const client = new DynamoDBClient(dynamodbClientOptions);

const imagesTable = process.env.IMAGES_TABLE;
const imageIdIndex = process.env.IMAGE_ID_INDEX;

const getImage: ValidatedEventAPIGatewayProxyEvent<
  typeof schema
> = async event => {
  console.log(event);

  const imageId = event.pathParameters.imageId;

  const queryParams: QueryCommandInput = {
    TableName: imagesTable,
    IndexName: imageIdIndex,
    KeyConditionExpression: 'imageId = :imageId',
    ExpressionAttributeValues: {
      ':imageId': {
        S: imageId,
      },
    },
  };

  const queryCommand = new QueryCommand(queryParams);

  const result = await client.send(queryCommand);

  if (result.Count !== 0) {
    return {
      statusCode: 200,
      body: JSON.stringify(result.Items[0]),
    };
  }

  return {
    statusCode: 404,
    body: 'Not found image',
  };
};

export const main = middyfy(getImage);
