import { awsAccountId } from '@libs/account-id';
import { stage } from '@libs/check-stage';

export const imageS3Bucket = `serverless-udagram-images-${awsAccountId}-${stage}`;
