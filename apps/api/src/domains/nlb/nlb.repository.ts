import prisma from '../../config/database';
import logger from '../../utils/logger';
import {
  NLBWithRelations,
  NLBQueryOptions,
  CreateNLBInput,
  UpdateNLBInput,
  CreateNLBUpstreamData,
  NLBStats,
} from './nlb.types';
import { PaginationMeta } from '../../shared/types/common.types';

/**
 * Repository for Network Load Balancer database operations
 */
export class NLBRepository {
  /**
   * Find all NLBs with pagination and filters
   */
  async findAll(
    options: NLBQueryOptions
  ): Promise<{ nlbs: NLBWithRelations[]; pagination: PaginationMeta }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      filters = {},
    } = options;

    const pageNum = parseInt(page.toString());
    const limitNum = parseInt(limit.toString());
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.protocol) {
      where.protocol = filters.protocol;
    }

    if (filters.enabled !== undefined && filters.enabled !== '') {
      where.enabled = filters.enabled === 'true';
    }

    // Get total count
    const totalCount = await prisma.networkLoadBalancer.count({ where });

    // Get NLBs with pagination
    const nlbs = await prisma.networkLoadBalancer.findMany({
      where,
      include: {
        upstreams: {
          orderBy: { createdAt: 'asc' },
        },
        healthChecks: {
          orderBy: { checkedAt: 'desc' },
          take: 10,
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limitNum,
    });

    // Calculate pagination
    const totalPages = Math.ceil(totalCount / limitNum);

    return {
      nlbs: nlbs as NLBWithRelations[],
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1,
      },
    };
  }

  /**
   * Find NLB by ID
   */
  async findById(id: string): Promise<NLBWithRelations | null> {
    const nlb = await prisma.networkLoadBalancer.findUnique({
      where: { id },
      include: {
        upstreams: {
          orderBy: { createdAt: 'asc' },
        },
        healthChecks: {
          orderBy: { checkedAt: 'desc' },
          take: 50,
        },
      },
    });

    return nlb as NLBWithRelations | null;
  }

  /**
   * Find NLB by name
   */
  async findByName(name: string): Promise<NLBWithRelations | null> {
    const nlb = await prisma.networkLoadBalancer.findUnique({
      where: { name },
      include: {
        upstreams: true,
        healthChecks: {
          orderBy: { checkedAt: 'desc' },
          take: 10,
        },
      },
    });

    return nlb as NLBWithRelations | null;
  }

  /**
   * Find NLB by port
   */
  async findByPort(port: number): Promise<NLBWithRelations | null> {
    const nlb = await prisma.networkLoadBalancer.findFirst({
      where: { port },
      include: {
        upstreams: true,
      },
    });

    return nlb as NLBWithRelations | null;
  }

  /**
   * Create new NLB
   */
  async create(input: CreateNLBInput): Promise<NLBWithRelations> {
    const nlb = await prisma.networkLoadBalancer.create({
      data: {
        name: input.name,
        description: input.description,
        port: input.port,
        protocol: input.protocol,
        algorithm: input.algorithm || 'round_robin',
        status: 'inactive',
        enabled: true,
        proxyTimeout: input.proxyTimeout || 3,
        proxyConnectTimeout: input.proxyConnectTimeout || 1,
        proxyNextUpstream: input.proxyNextUpstream !== undefined ? input.proxyNextUpstream : true,
        proxyNextUpstreamTimeout: input.proxyNextUpstreamTimeout || 0,
        proxyNextUpstreamTries: input.proxyNextUpstreamTries || 0,
        healthCheckEnabled: input.healthCheckEnabled !== undefined ? input.healthCheckEnabled : true,
        healthCheckInterval: input.healthCheckInterval || 10,
        healthCheckTimeout: input.healthCheckTimeout || 5,
        healthCheckRises: input.healthCheckRises || 2,
        healthCheckFalls: input.healthCheckFalls || 3,
        upstreams: {
          create: input.upstreams.map((u: CreateNLBUpstreamData) => ({
            host: u.host,
            port: u.port,
            weight: u.weight || 1,
            maxFails: u.maxFails || 3,
            failTimeout: u.failTimeout || 10,
            maxConns: u.maxConns || 0,
            backup: u.backup || false,
            down: u.down || false,
            status: 'checking',
          })),
        },
      },
      include: {
        upstreams: true,
        healthChecks: true,
      },
    });

    return nlb as NLBWithRelations;
  }

  /**
   * Update NLB
   */
  async update(id: string, input: UpdateNLBInput): Promise<NLBWithRelations> {
    // If upstreams are provided, delete existing and create new ones
    if (input.upstreams) {
      await prisma.nLBUpstream.deleteMany({
        where: { nlbId: id },
      });
    }

    const nlb = await prisma.networkLoadBalancer.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        port: input.port,
        protocol: input.protocol,
        algorithm: input.algorithm,
        status: input.status,
        enabled: input.enabled,
        proxyTimeout: input.proxyTimeout,
        proxyConnectTimeout: input.proxyConnectTimeout,
        proxyNextUpstream: input.proxyNextUpstream,
        proxyNextUpstreamTimeout: input.proxyNextUpstreamTimeout,
        proxyNextUpstreamTries: input.proxyNextUpstreamTries,
        healthCheckEnabled: input.healthCheckEnabled,
        healthCheckInterval: input.healthCheckInterval,
        healthCheckTimeout: input.healthCheckTimeout,
        healthCheckRises: input.healthCheckRises,
        healthCheckFalls: input.healthCheckFalls,
        ...(input.upstreams && {
          upstreams: {
            create: input.upstreams.map((u: CreateNLBUpstreamData) => ({
              host: u.host,
              port: u.port,
              weight: u.weight || 1,
              maxFails: u.maxFails || 3,
              failTimeout: u.failTimeout || 10,
              maxConns: u.maxConns || 0,
              backup: u.backup || false,
              down: u.down || false,
              status: 'checking',
            })),
          },
        }),
      },
      include: {
        upstreams: true,
        healthChecks: {
          orderBy: { checkedAt: 'desc' },
          take: 10,
        },
      },
    });

    return nlb as NLBWithRelations;
  }

  /**
   * Delete NLB
   */
  async delete(id: string): Promise<void> {
    await prisma.networkLoadBalancer.delete({
      where: { id },
    });
  }

  /**
   * Update NLB status
   */
  async updateStatus(id: string, status: 'active' | 'inactive' | 'error'): Promise<void> {
    await prisma.networkLoadBalancer.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Toggle NLB enabled status
   */
  async toggleEnabled(id: string, enabled: boolean): Promise<NLBWithRelations> {
    const nlb = await prisma.networkLoadBalancer.update({
      where: { id },
      data: { 
        enabled,
        status: enabled ? 'active' : 'inactive',
      },
      include: {
        upstreams: true,
        healthChecks: {
          orderBy: { checkedAt: 'desc' },
          take: 10,
        },
      },
    });

    return nlb as NLBWithRelations;
  }

  /**
   * Update upstream status
   */
  async updateUpstreamStatus(
    upstreamId: string,
    status: 'up' | 'down' | 'checking',
    responseTime?: number,
    error?: string
  ): Promise<void> {
    await prisma.nLBUpstream.update({
      where: { id: upstreamId },
      data: {
        status,
        lastCheck: new Date(),
        responseTime,
        lastError: error,
      },
    });
  }

  /**
   * Create health check record
   */
  async createHealthCheck(
    nlbId: string,
    upstreamHost: string,
    upstreamPort: number,
    status: 'up' | 'down' | 'checking',
    responseTime?: number,
    error?: string
  ): Promise<void> {
    await prisma.nLBHealthCheck.create({
      data: {
        nlbId,
        upstreamHost,
        upstreamPort,
        status,
        responseTime,
        error,
      },
    });
  }

  /**
   * Get NLB statistics
   */
  async getStats(): Promise<NLBStats> {
    const [totalNLBs, activeNLBs, inactiveNLBs, upstreamStats] = await Promise.all([
      prisma.networkLoadBalancer.count(),
      prisma.networkLoadBalancer.count({ where: { status: 'active' } }),
      prisma.networkLoadBalancer.count({ where: { status: 'inactive' } }),
      prisma.nLBUpstream.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    const totalUpstreams = upstreamStats.reduce((acc, stat) => acc + stat._count, 0);
    const healthyUpstreams = upstreamStats
      .filter((s) => s.status === 'up' || s.status === 'checking')
      .reduce((acc, stat) => acc + stat._count, 0);
    const unhealthyUpstreams = upstreamStats.find((s) => s.status === 'down')?._count || 0;

    return {
      totalNLBs,
      activeNLBs,
      inactiveNLBs,
      totalUpstreams,
      healthyUpstreams,
      unhealthyUpstreams,
    };
  }
}
