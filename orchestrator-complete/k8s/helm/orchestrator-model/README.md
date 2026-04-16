Helm chart for model serving with canary rollout.

Usage:
  helm install my-model ./orchestrator-model --set image.repository=gcr.io/PROJECT/IMAGE --set image.tag=TAG

This chart includes a Flagger Canary manifest. Install Flagger and a service mesh (Istio/Contour/NGINX+Gateway) for canary traffic shifting.
