import * as client from 'prom-client';
export class MetricsService {
    constructor() {
        this.registry = new client.Registry();
        client.collectDefaultMetrics({ register: this.registry });
    }
    static getInstance() {
        if (!MetricsService.instance) {
            MetricsService.instance = new MetricsService();
        }
        return MetricsService.instance;
    }
    getMetrics() {
        return this.registry.metrics();
    }
}
//# sourceMappingURL=metrics.service.js.map