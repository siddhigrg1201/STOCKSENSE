interface ApiStats {
  successCount: number;
  failureCount: number;
  totalResponseTime: number;
  averageResponseTime: number;
}

export class Monitoring {
  private stats: Map<string, ApiStats> = new Map();

  recordSuccess(apiName: string, responseTime: number) {
    const current = this.stats.get(apiName) || { successCount: 0, failureCount: 0, totalResponseTime: 0, averageResponseTime: 0 };
    current.successCount++;
    current.totalResponseTime += responseTime;
    current.averageResponseTime = current.totalResponseTime / current.successCount;
    this.stats.set(apiName, current);
    console.log(`[Monitor] ${apiName} SUCCESS - ${responseTime}ms`);
  }

  recordFailure(apiName: string, error: any) {
    const current = this.stats.get(apiName) || { successCount: 0, failureCount: 0, totalResponseTime: 0, averageResponseTime: 0 };
    current.failureCount++;
    this.stats.set(apiName, current);
    console.error(`[Monitor] ${apiName} FAILED - ${error.message || error}`);
  }

  getStats() {
    return Object.fromEntries(this.stats);
  }
}

export const monitoring = new Monitoring();
