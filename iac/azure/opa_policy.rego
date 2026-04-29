# OPA policy: No-Before-Action gate example
package kubernetes.admission

default allow = false

allow {
  input.request.kind.kind == "Pod"
  input.request.operation == "CREATE"
  input.request.object.metadata.labels["approved"] == "true"
}
