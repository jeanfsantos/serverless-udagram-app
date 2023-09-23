let dynamodbClientOptions = {};

if (process.env.IS_OFFLINE) {
  dynamodbClientOptions = {
    region: 'localhost',
    endpoint: 'http://0.0.0.0:8000',
    // credentials: {
    //   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    //   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    // },
  };
}

export { dynamodbClientOptions };
