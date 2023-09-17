import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
} from 'aws-lambda';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const connectionsTable = process.env.CONNECTIONS_TABLE;

const connectHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  console.log('Websocket connect', event);

  const connectionId = event.requestContext.connectionId;
  const timestamp = new Date().toISOString();

  const item = {
    id: connectionId,
    timestamp,
  };

  const command = new PutCommand({
    TableName: connectionsTable,
    Item: item,
  });

  await docClient.send(command);

  return {
    statusCode: 200,
    body: '',
  };
};

export const main = connectHandler;
