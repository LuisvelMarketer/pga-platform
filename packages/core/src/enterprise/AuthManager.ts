/**
 * Authentication & Authorization Manager for PGA
 * Created by Luis Alfredo Velasquez Duran (Germany, 2025)
 *
 * Implements RBAC (Role-Based Access Control) and policy-based authorization.
 */

export type Permission =
    | 'genome:read'
    | 'genome:write'
    | 'genome:delete'
    | 'genome:evolve'
    | 'chat:send'
    | 'chat:read'
    | 'metrics:read'
    | 'metrics:export'
    | 'admin:all';

export type Role = 'admin' | 'developer' | 'viewer' | 'user' | 'custom';

export interface User {
    id: string;
    email?: string;
    roles: Role[];
    permissions: Permission[];
    tenantId?: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

export interface AuthContext {
    userId: string;
    roles?: Role[];
    permissions?: Permission[];
    tenantId?: string;
    metadata?: Record<string, unknown>;
}

export interface AuthPolicy {
    name: string;
    description?: string;
    effect: 'allow' | 'deny';
    actions: Permission[];
    resources?: string[]; // Resource patterns (e.g., 'genome:*', 'genome:abc-123')
    conditions?: ((context: AuthContext) => boolean | Promise<boolean>)[];
}

export interface AuthConfig {
    /**
     * Default role for new users
     */
    defaultRole?: Role;

    /**
     * Enable multi-tenancy
     */
    enableMultiTenancy?: boolean;

    /**
     * Require tenant ID for all operations
     */
    requireTenantId?: boolean;

    /**
     * Custom policies
     */
    policies?: AuthPolicy[];
}

/**
 * Authentication & Authorization Manager
 *
 * Manages users, roles, permissions, and access control.
 */
export class AuthManager {
    private config: Required<AuthConfig>;
    private users: Map<string, User> = new Map();
    private rolePermissions: Map<Role, Permission[]> = new Map();

    // Default role-permission mapping
    private static readonly DEFAULT_ROLE_PERMISSIONS: Map<Role, Permission[]> = new Map([
        ['admin', ['admin:all']], // Admin has all permissions
        [
            'developer',
            [
                'genome:read',
                'genome:write',
                'genome:evolve',
                'chat:send',
                'chat:read',
                'metrics:read',
            ],
        ],
        ['viewer', ['genome:read', 'chat:read', 'metrics:read']],
        ['user', ['chat:send', 'chat:read', 'genome:read']],
    ]);

    constructor(config: AuthConfig = {}) {
        this.config = {
            defaultRole: config.defaultRole || 'user',
            enableMultiTenancy: config.enableMultiTenancy ?? false,
            requireTenantId: config.requireTenantId ?? false,
            policies: config.policies || [],
        };

        // Initialize role permissions
        this.rolePermissions = new Map(AuthManager.DEFAULT_ROLE_PERMISSIONS);
    }

    /**
     * Create a new user
     */
    createUser(data: {
        id: string;
        email?: string;
        roles?: Role[];
        permissions?: Permission[];
        tenantId?: string;
        metadata?: Record<string, unknown>;
    }): User {
        const now = new Date();

        const user: User = {
            id: data.id,
            email: data.email,
            roles: data.roles || [this.config.defaultRole],
            permissions: data.permissions || [],
            tenantId: data.tenantId,
            metadata: data.metadata,
            createdAt: now,
            updatedAt: now,
        };

        // Validate tenant ID if required
        if (this.config.requireTenantId && !user.tenantId) {
            throw new Error('Tenant ID is required');
        }

        this.users.set(user.id, user);

        return user;
    }

    /**
     * Get user by ID
     */
    getUser(userId: string): User | undefined {
        return this.users.get(userId);
    }

    /**
     * Update user
     */
    updateUser(
        userId: string,
        updates: Partial<
            Omit<User, 'id' | 'createdAt' | 'updatedAt'>
        >
    ): User {
        const user = this.users.get(userId);

        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }

        Object.assign(user, updates, { updatedAt: new Date() });

        return user;
    }

    /**
     * Delete user
     */
    deleteUser(userId: string): boolean {
        return this.users.delete(userId);
    }

    /**
     * Add role to user
     */
    addRole(userId: string, role: Role): User {
        const user = this.getUser(userId);

        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }

        if (!user.roles.includes(role)) {
            user.roles.push(role);
            user.updatedAt = new Date();
        }

        return user;
    }

    /**
     * Remove role from user
     */
    removeRole(userId: string, role: Role): User {
        const user = this.getUser(userId);

        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }

        user.roles = user.roles.filter((r) => r !== role);
        user.updatedAt = new Date();

        return user;
    }

    /**
     * Add permission to user
     */
    addPermission(userId: string, permission: Permission): User {
        const user = this.getUser(userId);

        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }

        if (!user.permissions.includes(permission)) {
            user.permissions.push(permission);
            user.updatedAt = new Date();
        }

        return user;
    }

    /**
     * Remove permission from user
     */
    removePermission(userId: string, permission: Permission): User {
        const user = this.getUser(userId);

        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }

        user.permissions = user.permissions.filter((p) => p !== permission);
        user.updatedAt = new Date();

        return user;
    }

    /**
     * Check if user has permission
     */
    async hasPermission(
        userId: string,
        permission: Permission,
        resource?: string
    ): Promise<boolean> {
        const user = this.getUser(userId);

        if (!user) {
            return false;
        }

        // Check if user has admin role
        if (user.roles.includes('admin')) {
            return true;
        }

        // Check direct permissions
        if (user.permissions.includes(permission)) {
            return true;
        }

        // Check role-based permissions
        for (const role of user.roles) {
            const permissions = this.rolePermissions.get(role) || [];

            if (permissions.includes(permission) || permissions.includes('admin:all')) {
                return true;
            }
        }

        // Check policies
        const context: AuthContext = {
            userId: user.id,
            roles: user.roles,
            permissions: user.permissions,
            tenantId: user.tenantId,
            metadata: user.metadata,
        };

        const allowed = await this.checkPolicies(context, permission, resource);

        return allowed;
    }

    /**
     * Check policies
     */
    private async checkPolicies(
        context: AuthContext,
        permission: Permission,
        resource?: string
    ): Promise<boolean> {
        let allowed = false;

        for (const policy of this.config.policies) {
            // Check if policy applies to this permission
            if (!policy.actions.includes(permission)) {
                continue;
            }

            // Check resource pattern
            if (policy.resources && resource) {
                const matches = policy.resources.some((pattern) =>
                    this.matchResourcePattern(pattern, resource)
                );

                if (!matches) {
                    continue;
                }
            }

            // Check conditions
            if (policy.conditions) {
                const conditionsMet = await Promise.all(
                    policy.conditions.map((condition) => condition(context))
                );

                if (!conditionsMet.every((met) => met)) {
                    continue;
                }
            }

            // Apply policy effect
            if (policy.effect === 'allow') {
                allowed = true;
            } else if (policy.effect === 'deny') {
                // Deny takes precedence
                return false;
            }
        }

        return allowed;
    }

    /**
     * Match resource pattern
     */
    private matchResourcePattern(pattern: string, resource: string): boolean {
        // Simple wildcard matching
        const regex = new RegExp(
            '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
        );

        return regex.test(resource);
    }

    /**
     * Authorize operation
     */
    async authorize(
        userId: string,
        permission: Permission,
        resource?: string
    ): Promise<void> {
        const allowed = await this.hasPermission(userId, permission, resource);

        if (!allowed) {
            throw new Error(
                `User ${userId} is not authorized for permission: ${permission}${resource ? ` on resource: ${resource}` : ''}`
            );
        }
    }

    /**
     * Create authorization context
     */
    createContext(userId: string): AuthContext | null {
        const user = this.getUser(userId);

        if (!user) {
            return null;
        }

        return {
            userId: user.id,
            roles: user.roles,
            permissions: user.permissions,
            tenantId: user.tenantId,
            metadata: user.metadata,
        };
    }

    /**
     * Define custom role
     */
    defineRole(role: Role, permissions: Permission[]): void {
        this.rolePermissions.set(role, permissions);
    }

    /**
     * Add policy
     */
    addPolicy(policy: AuthPolicy): void {
        this.config.policies.push(policy);
    }

    /**
     * Remove policy
     */
    removePolicy(name: string): void {
        this.config.policies = this.config.policies.filter((p) => p.name !== name);
    }

    /**
     * List users by tenant
     */
    getUsersByTenant(tenantId: string): User[] {
        return Array.from(this.users.values()).filter(
            (u) => u.tenantId === tenantId
        );
    }

    /**
     * List users by role
     */
    getUsersByRole(role: Role): User[] {
        return Array.from(this.users.values()).filter((u) => u.roles.includes(role));
    }

    /**
     * Get statistics
     */
    getStats(): {
        totalUsers: number;
        usersByRole: Record<Role, number>;
        usersByTenant: Record<string, number>;
    } {
        const users = Array.from(this.users.values());

        const usersByRole: Partial<Record<Role, number>> = {};
        for (const user of users) {
            for (const role of user.roles) {
                usersByRole[role] = (usersByRole[role] || 0) + 1;
            }
        }

        const usersByTenant: Record<string, number> = {};
        for (const user of users) {
            if (user.tenantId) {
                usersByTenant[user.tenantId] =
                    (usersByTenant[user.tenantId] || 0) + 1;
            }
        }

        return {
            totalUsers: users.length,
            usersByRole: usersByRole as Record<Role, number>,
            usersByTenant,
        };
    }
}
