import { KMSClient, SignCommand } from "@aws-sdk/client-kms";
import { v4 as uuidv4 } from "uuid";
import qs from "qs";
import axios from "axios";
import { geyKeyData } from "./get-key-data";
import { toBase64Url } from "./utils";

const kmsClient = new KMSClient({});

const TOKEN_URL = process.env.TOKEN_URL;

export const handler = async () => {
  try {
    // Check if the TOKEN_URL environment variable is set
    if (!TOKEN_URL) {
      throw new Error("TOKEN_URL environment variable not set");
    }

    // Query the latest key from DynamoDB using the prefix and version
    let keyData = await geyKeyData();

    // JWT Header
    const header = {
      alg: "RS512",
      typ: "JWT",
      kid: keyData.alias,
    };

    console.log("JWT Header:", header);

    // JWT Payload (Claims)
    const claims = {
      sub: "mfUvpoOKBl08c1secns1Tp1UP8ZMoh2h",
      iss: "mfUvpoOKBl08c1secns1Tp1UP8ZMoh2h",
      jti: uuidv4(),
      aud: TOKEN_URL,
      exp: Math.floor(Date.now() / 1000) + 5 * 60, // Current time + 5 minutes
    };

    // Create the JWT to be signed
    const encodedHeader = toBase64Url(JSON.stringify(header));
    const encodedPayload = toBase64Url(JSON.stringify(claims));
    const jwtToBeSigned = `${encodedHeader}.${encodedPayload}`;

    // Sign the JWT using AWS KMS
    const signCommand = new SignCommand({
      KeyId: keyData.keyId,
      Message: Buffer.from(jwtToBeSigned),
      MessageType: "RAW",
      SigningAlgorithm: "RSASSA_PKCS1_V1_5_SHA_512",
    });

    const { Signature } = await kmsClient.send(signCommand);

    if (!Signature) {
      throw new Error("Failed to sign the JWT");
    }

    // Append the signature to the JWT
    const jwtSignature = toBase64Url(Signature);
    const signedJWT = `${jwtToBeSigned}.${jwtSignature}`;

    console.log("Signed JWT:", signedJWT);

    const values = {
      grant_type: "client_credentials",
      client_assertion_type:
        "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: signedJWT,
    };

    const data = qs.stringify(values);
    const response = await axios.post(TOKEN_URL, data, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error getting the token:", error);
    return {
      statusCode: 500,
      body: "Internal Server Error",
    };
  }
};
