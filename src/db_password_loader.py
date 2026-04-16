import os
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

# Fetch DB_PASSWORD from Azure Key Vault if not set in env
DB_PASSWORD = os.getenv("DB_PASSWORD")
if not DB_PASSWORD:
    key_vault_url = os.getenv("KEY_VAULT_URL", "https://my-tfx-keyvault.vault.azure.net/")
    credential = DefaultAzureCredential()
    client = SecretClient(vault_url=key_vault_url, credential=credential)
    DB_PASSWORD = client.get_secret("DB_PASSWORD").value

# Use DB_PASSWORD in your app as needed
print("DB_PASSWORD:", DB_PASSWORD)
