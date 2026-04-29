package governance

# Deny external actions unless approved
deny[msg] {
  input.action.type == 'external'
  not input.action.approved
  msg = sprintf('External action %s requires approval', [input.action.name])
}
