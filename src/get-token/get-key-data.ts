import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const dynamoDbClient = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(dynamoDbClient);

const JWT_KEYS_DATA_TABLE =
  process.env.JWT_KEYS_DATA_TABLE || "JwtKeysDataTable";
const PREFIX = process.env.PREFIX || "test";

export async function geyKeyData(): Promise<{ keyId: string; alias: string }> {
  const { Items } = await documentClient.send(
    new QueryCommand({
      TableName: JWT_KEYS_DATA_TABLE,
      KeyConditionExpression: "prefix = :prefixVal",
      ExpressionAttributeValues: {
        ":prefixVal": PREFIX,
      },
      ScanIndexForward: false,
      Limit: 2,
    })
  );

  console.log("Items:", Items);

  if (!Items || Items.length === 0 || !Items[0]) {
    throw new Error("Failed to fetch signing key from DynamoDB");
  }

  let keyId;
  let alias;

  if (Items.length === 1) {
    keyId = Items[0].keyId;
    alias = `${PREFIX}-${Items[0].version}`;
  } else {
    const currentDate = new Date();
    const keyExpirationDate = new Date(Items[1].expirationDate);
    if (currentDate <= keyExpirationDate) {
      keyId = Items[1].keyId;
      alias = `${PREFIX}-${Items[1].version}`;
    } else {
      keyId = Items[0].keyId;
      alias = `${PREFIX}-${Items[0].version}`;
    }
  }
  return { keyId, alias };
}
