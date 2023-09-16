import { awsAccountId } from '@libs/account-id';
import { stage } from '@libs/check-stage';
import { region } from './check-region';

export const topicName = `imagesTopic-${stage}`;

export const topicNameArn = `arn:aws:sns:${region}:${awsAccountId}:${topicName}`;
