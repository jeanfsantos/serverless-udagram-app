import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi';
import {
  DeleteItemCommand,
  DynamoDBClient,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Event, S3Handler } from 'aws-lambda';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const connectionsTable = process.env.CONNECTIONS_TABLE;
const stage = process.env.STAGE;
const apiId = process.env.API_ID;
const region = process.env.REGION;

const connectionParams = {
  endpoint: `https://${apiId}.execute-api.${region}.amazonaws.com/${stage}`,
};

const apiGateway = new ApiGatewayManagementApiClient(connectionParams);

const sendUploadNotifications: S3Handler = async (event: S3Event) => {
  for (const record of event.Records) {
    const key = record.s3.object.key;
    console.log('Processing S3 item with key: ', key);

    const scanCommand = new ScanCommand({
      TableName: connectionsTable,
    });
    const connections = await docClient.send(scanCommand);

    const payload = {
      imageId: key,
    };

    for (const connection of connections.Items) {
      const connectionId = connection.id.S;
      await sendMessageToClient(connectionId, payload);
    }
  }
};

async function sendMessageToClient(connectionId, payload) {
  try {
    console.log('Sending message to a connection', connectionId);

    const postToConnectionCommand = new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(payload),
    });

    await apiGateway.send(postToConnectionCommand);
  } catch (e) {
    console.log('Failed to send message', JSON.stringify(e));

    if (e.statusCode === 410) {
      console.log('Stale connection');

      const deleteItemCommand = new DeleteItemCommand({
        TableName: connectionsTable,
        Key: {
          id: connectionId,
        },
      });

      await docClient.send(deleteItemCommand);
    }
  }
}

export const main = sendUploadNotifications;
