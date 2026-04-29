// scripts/scaffold_iac.js
// Scaffolds Terraform/Kubernetes manifests for multi-AZ clusters, autoscaling, Redis, DB clusters
const fs = require("fs");
const path = require("path");

const templates = [
  "terraform/main.tf",
  "terraform/variables.tf",
  "terraform/outputs.tf",
  "k8s/multi-az-cluster.yaml",
  "k8s/autoscale.yaml",
  "k8s/redis.yaml",
  "k8s/db-vitess.yaml",
  "k8s/db-cockroachdb.yaml",
];

templates.forEach((tmpl) => {
  const dest = path.join(process.cwd(), tmpl);
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, `# Template: ${tmpl}\n`);
  }
});

console.log("IaC templates scaffolded. Edit the generated files as needed.");
