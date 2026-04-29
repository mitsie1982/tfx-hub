package orchestrator

default allow = false

allow {
  input.contract.risk != "high"
}

allow {
  input.contract.risk == "high"
  input.admin_token == data.admin.token
}
