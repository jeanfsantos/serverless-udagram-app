import { S3Event, S3Handler } from 'aws-lambda';

const sendUploadNotifications: S3Handler = async (event: S3Event) => {
  for (const record of event.Records) {
    const key = record.s3.object.key;
    console.log('Processing S3 item with key: ', key);
  }
};

export const main = sendUploadNotifications;
