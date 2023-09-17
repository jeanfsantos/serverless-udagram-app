import { handlerPath } from '@libs/handler-resolver';
import { topicName, topicNameArn } from '@libs/sns-topic';

export default {
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
