if (!process.env.AWS_ACCOUNT_ID) {
  throw new Error('AWS_ACCOUNT_ID is required!');
}

export const awsAccountId = process.env.AWS_ACCOUNT_ID;
