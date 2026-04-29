import yaml

with open("monitoring/alertmanager_receivers.yml", "r", encoding="utf-8") as f:
    yaml.safe_load(f)
print("YAML parse OK")
