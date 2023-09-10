import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';

import schema from './schema';

const client = new DynamoDBClient({});

const groupsTable = process.env.GROUPS_TABLE;

const getGroups: ValidatedEventAPIGatewayProxyEvent<
  typeof schema
> = async event => {
  const scanParams = {
    TableName: groupsTable,
  };
  const limit = getQueryParameter(event, 'limit');
  const nextKey = getQueryParameter(event, 'nextKey');

  if (limit) {
    scanParams['Limit'] = Number(limit);
  }

  if (nextKey) {
    scanParams['ExclusiveStartKey'] = JSON.parse(decodeURIComponent(nextKey));
  }

  const command = new ScanCommand(scanParams);

  const result = await client.send(command);

  const items = result.Items.map(item => {
    const { description, name, id } = item;
    return {
      id: id.S,
      name: name.S,
      description: description.S,
    };
  });

  return formatJSONResponse({
    items,
    nextKey: encodeNextKey(result.LastEvaluatedKey),
  });
};

/**
 * Get a query parameter or return "undefined"
 *
 * @param {Object} event HTTP event passed to a Lambda function
 * @param {string} name a name of a query parameter to return
 *
 * @returns {string} a value of a query parameter value or "undefined" if a parameter is not defined
 */
function getQueryParameter(event, name) {
  const queryParams = event.queryStringParameters;
  if (!queryParams) {
    return undefined;
  }

  return queryParams[name];
}

/**
 * Encode last evaluated key using
 *
 * @param {Object} lastEvaluatedKey a JS object that represents last evaluated key
 *
 * @return {string} URI encoded last evaluated key
 */
function encodeNextKey(lastEvaluatedKey) {
  if (!lastEvaluatedKey) {
    return null;
  }

  return encodeURIComponent(JSON.stringify(lastEvaluatedKey));
}

export const main = middyfy(getGroups);
