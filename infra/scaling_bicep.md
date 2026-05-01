# Hyperscale Cloud Architecture (Azure)

- **Web App Autoscale**: Use Azure App Service autoscale rules for CPU/memory/requests.
- **Database Sharding**: Use Azure SQL Elastic Pools or Cosmos DB with partition keys.
- **Caching**: Integrate Azure Cache for Redis for session/data caching.
- **CDN**: Use Azure Front Door or Azure CDN for global static asset delivery.
- **Queueing**: Use Azure Service Bus or Storage Queues for async jobs.

See infra/azure-hyperscale.bicep for reference deployment.