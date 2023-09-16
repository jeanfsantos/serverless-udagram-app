import { handlerPath } from '@libs/handler-resolver';
import { topicName, topicNameArn } from '@libs/sns-topic';

export default {
  environment: {
    API_ID: {
      Ref: 'WebsocketsApi',
    },
  },
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      sns: {
        arn: topicNameArn,
        topicName: topicName,
      },
    },
  ],
};
