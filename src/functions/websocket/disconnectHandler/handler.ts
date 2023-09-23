import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
} from 'aws-lambda';
import { dynamodbClientOptions } from 'src/config/dynamodbClientOptions';

const client = new DynamoDBClient(dynamodbClientOptions);
const docClient = DynamoDBDocumentClient.from(client);

const connectionsTable = process.env.CONNECTIONS_TABLE;

const disconnectHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  console.log('Websocket connect', event);

  const connectionId = event.requestContext.connectionId;

  const command = new DeleteCommand({
    TableName: connectionsTable,
    Key: {
      id: connectionId,
    },
  });

  await docClient.send(command);

  return {
    statusCode: 200,
    body: '',
  };
};

export const main = disconnectHandler;
