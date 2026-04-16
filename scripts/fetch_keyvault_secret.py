from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

key_vault_url = "https://my-tfx-keyvault.vault.azure.net/"
credential = DefaultAzureCredential()
client = SecretClient(vault_url=key_vault_url, credential=credential)

secret = client.get_secret("DB_PASSWORD")
print("Secret value:", secret.value)
