# JWKS Public Endpoint and Key Rotation Solution

## Overview

This solution provides a JWKS (JSON Web Key Set) public endpoint and automates the rotation of key pairs. It's designed to support the OAuth 2.0 client credentials flow for machine-to-machine (M2M) authentication.

## Features

1. **JWKS Public Endpoint**: An endpoint that serves the public keys in JWKS format, which can be used by clients to verify JWTs (JSON Web Tokens).
2. **Automated Key Rotation**: A mechanism to periodically generate a new key pair, ensuring that the keys used for signing JWTs are always fresh and secure.
3. **DynamoDB Integration**: A DynamoDB table that stores metadata about each key, including its version and expiration date.

## Architecture

1. **Generate Key Pair Lambda**: This function is responsible for creating a new key pair using AWS KMS and storing its metadata in a DynamoDB table. It's scheduled to run every specified number of days for key rotation.
2. **JWKS Endpoint Lambda**: This function retrieves the latest keys from the DynamoDB table and serves them in JWKS format.
3. **DynamoDB Table**: Stores metadata about each key, including its version and expiration date.
4. **API Gateway**: Provides a public endpoint for the JWKS, accessible at `https://<ServerlessRestApi>.execute-api.<AWS::Region>.amazonaws.com/<env>/.well-known/jwks.json`.

## Usage

1. **Deploying the Solution**:
   - Ensure you have AWS SAM CLI installed.
   - Navigate to the project root directory.
   - Run `pnpm i` to install the npm packages.
   - Run `pnpm run build` to build the solution.
   - Deploy the solution using `sam deploy --guided`.

2. **Accessing the JWKS Endpoint**:
   - Once deployed, you can access the JWKS endpoint at the provided API Gateway URL.

3. **Monitoring Key Rotation**:
   - Key rotation events can be monitored in the AWS Lambda logs via Amazon CloudWatch.

## Security Considerations

1. **Key Rotation**: The solution rotates keys periodically (every specified number of days) to enhance security. Ensure you understand the rotation frequency and adjust it according to your security requirements.
2. **Access Control**: Ensure that only authorized entities can access the DynamoDB table and the AWS KMS service for key generation.

## Conclusion

This solution provides a robust mechanism for M2M authentication in OAuth 2.0 scenarios, ensuring that JWTs are signed with regularly rotated keys, enhancing the security of the system.
