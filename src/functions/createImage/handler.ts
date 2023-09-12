import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';
import schema from './schema';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const s3 = new S3Client();

const imagesTable = process.env.IMAGES_TABLE;
const bucketName = process.env.IMAGE_S3_BUCKET;
const urlExpiration = process.env.SIGNED_URL_EXPIRATION;

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

  const uploadUrl = await getUploadUrl(imageId);

  return formatJSONResponse({
    item: newItem,
    uploadUrl,
  });
};

async function getUploadUrl(imageId: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: imageId,
  });

  const url = await getSignedUrl(s3, command, {
    expiresIn: Number(urlExpiration),
  });

  return url;
}

export const main = middyfy(createImage);
