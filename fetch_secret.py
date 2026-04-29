import os

from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

vault_url = os.environ["KEY_VAULT_URL"]
secret_name = os.environ["SECRET_NAME"]
client = SecretClient(vault_url=vault_url, credential=DefaultAzureCredential())
print(client.get_secret(secret_name).value)
