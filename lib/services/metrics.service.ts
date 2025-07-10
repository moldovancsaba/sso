import * as client from 'prom-client';

export class MetricsService {
  private static instance: MetricsService;
  private registry: client.Registry;

  private constructor() {
    this.registry = new client.Registry();
    client.collectDefaultMetrics({ register: this.registry });
  }

  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
