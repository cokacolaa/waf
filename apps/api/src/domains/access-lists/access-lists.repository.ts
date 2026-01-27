import prisma from '../../config/database';
import {
  AccessListWithRelations,
  AccessListQueryOptions,
  CreateAccessListInput,
  UpdateAccessListInput,
} from './access-lists.types';
import { PaginationMeta } from '../../shared/types/common.types';

/**
 * Repository for Access Lists data access
 */
export class AccessListsRepository {
  /**
   * Find all access lists with pagination and filters
   */
  async findAll(
    options: AccessListQueryOptions
  ): Promise<{ accessLists: AccessListWithRelations[]; pagination: PaginationMeta }> {
    const {
      page = 1,
      limit = 10,
      search,
      type,
      enabled,
    } = options;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (enabled !== undefined) {
      where.enabled = enabled;
    }

    // Get total count
    const total = await prisma.accessList.count({ where });

    // Get access lists
    const accessLists = await prisma.accessList.findMany({
      where,
      skip,
      take: limit,
      include: {
        authUsers: true,
        domains: {
          include: {
            domain: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      accessLists,
      pagination: {
        page,
        limit,
        totalCount: total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Find access list by ID
   */
  async findById(id: string): Promise<AccessListWithRelations | null> {
    return prisma.accessList.findUnique({
      where: { id },
      include: {
        authUsers: true,
        domains: {
          include: {
            domain: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Find access list by name
   */
  async findByName(name: string): Promise<AccessListWithRelations | null> {
    return prisma.accessList.findUnique({
      where: { name },
      include: {
        authUsers: true,
        domains: {
          include: {
            domain: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Create new access list
   */
  async create(data: CreateAccessListInput): Promise<AccessListWithRelations> {
    const { authUsers, domainIds, ...accessListData } = data;

    return prisma.accessList.create({
      data: {
        ...accessListData,
        authUsers: authUsers
          ? {
              create: authUsers.map((user) => ({
                username: user.username,
                passwordHash: user.password, // Will be hashed in service
                description: user.description,
              })),
            }
          : undefined,
        domains: domainIds
          ? {
              create: domainIds.map((domainId) => ({
                domainId,
                enabled: true,
              })),
            }
          : undefined,
      },
      include: {
        authUsers: true,
        domains: {
          include: {
            domain: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Update access list
   */
  async update(
    id: string,
    data: UpdateAccessListInput
  ): Promise<AccessListWithRelations> {
    const { authUsers, domainIds, ...accessListData } = data;

    // Start a transaction to handle updates
    return prisma.$transaction(async (tx) => {
      // Get existing auth users to preserve passwords if not changed
      let existingAuthUsers: { username: string; passwordHash: string }[] = [];
      if (authUsers !== undefined) {
        existingAuthUsers = await tx.accessListAuthUser.findMany({
          where: { accessListId: id },
          select: { username: true, passwordHash: true },
        });
      }

      // Delete existing auth users if provided
      if (authUsers !== undefined) {
        await tx.accessListAuthUser.deleteMany({
          where: { accessListId: id },
        });
      }

      // Delete existing domain associations if provided
      if (domainIds !== undefined) {
        await tx.accessListDomain.deleteMany({
          where: { accessListId: id },
        });
      }

      // Update access list
      return tx.accessList.update({
        where: { id },
        data: {
          ...accessListData,
          authUsers: authUsers
            ? {
                create: authUsers.map((user) => {
                  // If password is empty, try to preserve old password
                  let password = user.password;
                  if (!password || password.trim() === '') {
                    const existingUser = existingAuthUsers.find(
                      (u) => u.username === user.username
                    );
                    password = existingUser?.passwordHash || '';
                  }

                  return {
                    username: user.username,
                    passwordHash: password,
                    description: user.description,
                  };
                }),
              }
            : undefined,
          domains: domainIds
            ? {
                create: domainIds.map((domainId) => ({
                  domainId,
                  enabled: true,
                })),
              }
            : undefined,
        },
        include: {
          authUsers: true,
          domains: {
            include: {
              domain: {
                select: {
                  id: true,
                  name: true,
                  status: true,
                },
              },
            },
          },
        },
      });
    });
  }

  /**
   * Delete access list
   */
  async delete(id: string): Promise<void> {
    await prisma.accessList.delete({
      where: { id },
    });
  }

  /**
   * Toggle access list enabled status
   */
  async toggleEnabled(id: string, enabled: boolean): Promise<AccessListWithRelations> {
    return prisma.accessList.update({
      where: { id },
      data: { enabled },
      include: {
        authUsers: true,
        domains: {
          include: {
            domain: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Apply access list to domain
   */
  async applyToDomain(
    accessListId: string,
    domainId: string,
    enabled: boolean = true
  ): Promise<void> {
    await prisma.accessListDomain.upsert({
      where: {
        accessListId_domainId: {
          accessListId,
          domainId,
        },
      },
      create: {
        accessListId,
        domainId,
        enabled,
      },
      update: {
        enabled,
      },
    });
  }

  /**
   * Remove access list from domain
   */
  async removeFromDomain(accessListId: string, domainId: string): Promise<void> {
    await prisma.accessListDomain.delete({
      where: {
        accessListId_domainId: {
          accessListId,
          domainId,
        },
      },
    });
  }

  /**
   * Get access lists by domain ID
   */
  async findByDomainId(domainId: string): Promise<AccessListWithRelations[]> {
    const accessListDomains = await prisma.accessListDomain.findMany({
      where: { domainId },
      include: {
        accessList: {
          include: {
            authUsers: true,
            domains: {
              include: {
                domain: {
                  select: {
                    id: true,
                    name: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return accessListDomains.map((ald) => ald.accessList);
  }

  /**
   * Get statistics
   */
  async getStats() {
    const totalAccessLists = await prisma.accessList.count();
    const enabledAccessLists = await prisma.accessList.count({
      where: { enabled: true },
    });
    const totalAuthUsers = await prisma.accessListAuthUser.count();
    const totalAssignedDomains = await prisma.accessListDomain.count();

    return {
      totalAccessLists,
      enabledAccessLists,
      totalAuthUsers,
      totalAssignedDomains,
    };
  }
}

export const accessListsRepository = new AccessListsRepository();
