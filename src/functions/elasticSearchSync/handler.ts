import { DynamoDBStreamEvent, DynamoDBStreamHandler } from 'aws-lambda';

const elasticSearchSync: DynamoDBStreamHandler = async (
  event: DynamoDBStreamEvent,
) => {
  console.log('Processing events batch from DynamoDB', JSON.stringify(event));

  for (const record of event.Records) {
    console.log('Processing record', JSON.stringify(record));
  }
};

export const main = elasticSearchSync;
