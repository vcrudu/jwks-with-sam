import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  KMSClient,
  GetPublicKeyCommand,
  GetPublicKeyCommandInput,
  GetPublicKeyCommandOutput,
} from "@aws-sdk/client-kms";
import * as jose from "jose";

const dynamoDbClient = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(dynamoDbClient);
const kmsClient = new KMSClient({});

const JWT_KEYS_DATA_TABLE = process.env.JWT_KEYS_DATA_TABLE || "JwtKeysDataTable";
const PREFIX = process.env.PREFIX || "test";

export const handler = async () => {
  try {
    // Query the last 2 keys from DynamoDB using the prefix and version
    const { Items } = await documentClient.send(
      new QueryCommand({
        TableName: JWT_KEYS_DATA_TABLE,
        KeyConditionExpression: "prefix = :prefixVal",
        ExpressionAttributeValues: {
          ":prefixVal": PREFIX,
        },
        ScanIndexForward: false, // This will sort the results in descending order
        Limit: 2,
      })
    );

    if (!Items) {
      throw new Error("Failed to fetch keys from DynamoDB");
    }

    const jwks: jose.JSONWebKeySet = {
      keys: [],
    };

    for (const keyDataItem of Items) {
      const currentDate = new Date();
      const keyExpirationDate = new Date(keyDataItem.expirationDate!.S!); // Assuming expirationDate is stored as a string in ISO format

      // If the key is not expired or it's the latest key, add it to the JWKS
      if (currentDate <= keyExpirationDate) {
        const keyOutput = await kmsClient.send<
          GetPublicKeyCommandInput,
          GetPublicKeyCommandOutput
        >(new GetPublicKeyCommand({ KeyId: `$` }));

        if (keyOutput && keyOutput.PublicKey) {
          const jwk = await jose.exportJWK(keyOutput.PublicKey);
          jwks.keys.push(jwk);
        } else {
          throw new Error("Failed to fetch public key from KMS");
        }
      }
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": "attachment; filename=jwks.json",
      },
      body: JSON.stringify(jwks),
    };
  } catch (error) {
    console.error("Error fetching JWKS:", error);
    return {
      statusCode: 500,
      body: "Internal Server Error",
    };
  }
};
