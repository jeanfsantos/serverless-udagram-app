import { Client } from '@elastic/elasticsearch';
import { createConnector } from 'aws-elasticsearch-js';
import { DynamoDBStreamEvent, DynamoDBStreamHandler } from 'aws-lambda';

const region = process.env.REGION;
const domain = `https://${process.env.ES_ENDPOINT}`;

const elasticSearchSync: DynamoDBStreamHandler = async (
  event: DynamoDBStreamEvent,
) => {
  console.log('Processing events batch from DynamoDB', JSON.stringify(event));

  const client = new Client({
    nodes: [domain],
    Connection: createConnector({ region }),
  });

  for (const record of event.Records) {
    try {
      console.log('Processing record', JSON.stringify(record));

      if (record.eventName !== 'INSERT') {
        continue;
      }

      const newItem = record.dynamodb.NewImage;
      const imageId = newItem.imageId.S;
      const body = {
        imageId: newItem.imageId.S,
        groupId: newItem.groupId.S,
        imageUrl: newItem.imageUrl.S,
        title: newItem.title.S,
        timestamp: newItem.timestamp.S,
      };

      const response = await client.index({
        index: 'images-index',
        id: imageId,
        body,
      });

      console.log('Document indexed:', response);
    } catch (e) {
      console.error('Error indexing document:', e);
    }
  }
};

export const main = elasticSearchSync;
