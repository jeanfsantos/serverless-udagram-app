import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

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
const region = process.env.REGION;

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
    imageUrl: `https://${bucketName}.s3.${region}.amazonaws.com/${imageId}`,
  };

  const command = new PutCommand({
    TableName: imagesTable,
    Item: newItem,
  });

  await docClient.send(command);

  const uploadUrl = await getUploadUrl(imageId);

  return {
    ...formatJSONResponse({
      item: newItem,
      uploadUrl,
    }),
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  };
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
