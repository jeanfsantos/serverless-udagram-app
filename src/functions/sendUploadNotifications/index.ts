import { handlerPath } from '@libs/handler-resolver';
import { imageS3Bucket } from '@libs/s3-bucket';

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      s3: {
        bucket: imageS3Bucket,
        event: 's3:ObjectCreated:*',
        rules: [
          {
            prefix: 'images/',
          },
          {
            suffix: '.png',
          },
        ],
        existing: true,
      },
    },
  ],
};
