# OpenAI + AWS Secrets Manager Integration Example
# This script demonstrates how to securely retrieve OpenAI API keys from AWS Secrets Manager
# and use them to call the OpenAI API (Python example)

import boto3
import openai
import os

def get_secret(secret_name, region_name="us-east-1"):
    """Retrieve secret from AWS Secrets Manager."""
    session = boto3.session.Session()
    client = session.client(
        service_name='secretsmanager',
        region_name=region_name
    )
    get_secret_value_response = client.get_secret_value(SecretId=secret_name)
    return get_secret_value_response['SecretString']

# Replace with your actual secret name and region
SECRET_NAME = "openai/apikey"
REGION_NAME = "us-east-1"

# Retrieve the OpenAI API key from AWS Secrets Manager
api_key = get_secret(SECRET_NAME, REGION_NAME)
openai.api_key = api_key

# Example: Call OpenAI's completion API
response = openai.Completion.create(
    model="text-davinci-003",
    prompt="Say hello to the world!",
    max_tokens=10
)
print(response.choices[0].text.strip())
