package orchestrator.policies

# Deny actions that require external side effects unless approved
deny[msg] {
  input.action.type == 'external'
  not input.action.approved
  msg = sprintf('External action %s requires approval', [input.action.name])
}

# Enforce minimal tool contract fields
deny[msg] {
  not input.tool_contract.name
  msg = 'tool_contract.name missing'
}
