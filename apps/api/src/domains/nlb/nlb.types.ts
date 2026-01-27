import { NetworkLoadBalancer, NLBUpstream, NLBHealthCheck } from '@prisma/client';

/**
 * Network Load Balancer types and interfaces
 */

// NLB with all relations
export interface NLBWithRelations extends NetworkLoadBalancer {
  upstreams: NLBUpstream[];
  healthChecks?: NLBHealthCheck[];
}

// Upstream creation data
export interface CreateNLBUpstreamData {
  host: string;
  port: number;
  weight?: number;
  maxFails?: number;
  failTimeout?: number;
  maxConns?: number;
  backup?: boolean;
  down?: boolean;
}

// NLB creation input
export interface CreateNLBInput {
  name: string;
  description?: string;
  port: number; // Must be >= 10000
  protocol: 'tcp' | 'udp' | 'tcp_udp';
  algorithm?: 'round_robin' | 'least_conn' | 'ip_hash' | 'hash';
  upstreams: CreateNLBUpstreamData[];
  
  // Advanced settings
  proxyTimeout?: number;
  proxyConnectTimeout?: number;
  proxyNextUpstream?: boolean;
  proxyNextUpstreamTimeout?: number;
  proxyNextUpstreamTries?: number;
  
  // Health check settings
  healthCheckEnabled?: boolean;
  healthCheckInterval?: number;
  healthCheckTimeout?: number;
  healthCheckRises?: number;
  healthCheckFalls?: number;
}

// NLB update input
export interface UpdateNLBInput {
  name?: string;
  description?: string;
  port?: number;
  protocol?: 'tcp' | 'udp' | 'tcp_udp';
  algorithm?: 'round_robin' | 'least_conn' | 'ip_hash' | 'hash';
  status?: 'active' | 'inactive' | 'error';
  enabled?: boolean;
  upstreams?: CreateNLBUpstreamData[];
  
  // Advanced settings
  proxyTimeout?: number;
  proxyConnectTimeout?: number;
  proxyNextUpstream?: boolean;
  proxyNextUpstreamTimeout?: number;
  proxyNextUpstreamTries?: number;
  
  // Health check settings
  healthCheckEnabled?: boolean;
  healthCheckInterval?: number;
  healthCheckTimeout?: number;
  healthCheckRises?: number;
  healthCheckFalls?: number;
}

// NLB query filters
export interface NLBQueryFilters {
  search?: string;
  status?: string;
  protocol?: string;
  enabled?: string;
}

// NLB query options
export interface NLBQueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: NLBQueryFilters;
}

// Nginx stream config generation options
export interface NginxStreamConfigOptions {
  nlb: NLBWithRelations;
}

// Health check result
export interface HealthCheckResult {
  upstreamHost: string;
  upstreamPort: number;
  status: 'up' | 'down' | 'checking';
  responseTime?: number;
  error?: string;
}

// NLB statistics
export interface NLBStats {
  totalNLBs: number;
  activeNLBs: number;
  inactiveNLBs: number;
  totalUpstreams: number;
  healthyUpstreams: number;
  unhealthyUpstreams: number;
}
