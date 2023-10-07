import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { KMSClient, CreateKeyCommand, CreateAliasCommandInput, CreateAliasCommand } from "@aws-sdk/client-kms";

const JWT_KEYS_DATA_TABLE = process.env.JWT_KEYS_DATA_TABLE || "JwtKeysDataTable";
const PREFIX = process.env.PREFIX || "test";

const dynamoDbClient = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(dynamoDbClient);
const kmsClient = new KMSClient({});

export const handler = async () => {
  try {
    // Retrieve the last key from DynamoDB
    const queryCommand = new QueryCommand({
      TableName: JWT_KEYS_DATA_TABLE,
      KeyConditionExpression: "prefix = :prefixVal",
      ExpressionAttributeValues: {
        ":prefixVal": PREFIX,
      },
      ScanIndexForward: false, // This will sort the results in descending order
      Limit: 1,
    });

    const queryResult = await documentClient.send(queryCommand);

    let currentVersion = 0;
    if (
      queryResult.Items &&
      queryResult.Items.length > 0 &&
      queryResult.Items[0]
    ) {
      currentVersion = parseInt(queryResult.Items[0].version || "0", 10);
    }

    const { KeyMetadata } = await kmsClient.send(
      new CreateKeyCommand({
        CustomerMasterKeySpec: "RSA_2048",
        KeyUsage: "SIGN_VERIFY",
        Description: "Key for JWT signing",
      })
    );

    if (!KeyMetadata) {
      throw new Error("Failed to create key");
    }

    const newVersion = currentVersion + 1;

    // Create an alias for the key
    await kmsClient.send(
      new CreateAliasCommand({
        TargetKeyId: KeyMetadata.KeyId,
        AliasName: `${PREFIX}_v${newVersion}`,
      })
    );

    // Save the key data in the DynamoDB table
    await documentClient.send(
      new PutCommand({
        TableName: JWT_KEYS_DATA_TABLE,
        Item: {
          prefix: PREFIX,
          version: newVersion.toString(),
          keyId: KeyMetadata.KeyId,
          expirationDate: new Date(
            Date.now() + 45 * 24 * 60 * 60 * 1000
          ).toISOString(), // 45 days from now
        },
      })
    );

    return {
      statusCode: 200,
      body: "Key pair generated and saved successfully",
    };
  } catch (error) {
    console.error("Error generating key pair:", error);
    return {
      statusCode: 500,
      body: "Internal Server Error",
    };
  }
};
