import { PrismaClient, DefaultRole } from '../generated/prisma';
import { hash } from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  // Seed Roles
  const adminRole = await prisma.role.upsert({
    where: { name: DefaultRole.ADMIN },
    update: {},
    create: {
      name: DefaultRole.ADMIN,
      description: 'Administrator with all permissions',
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: DefaultRole.USER },
    update: {},
    create: {
      name: DefaultRole.USER,
      description: 'Regular user with basic permissions',
    },
  });
  console.log('Roles seeded.');

  // Seed Permissions (example)
  const permissionsData = [
    // User permissions
    {
      action: 'manage',
      subject: 'all',
      description: 'Super admin: Can do anything',
    }, // For ADMIN
    { action: 'read', subject: 'User', description: 'Read own user profile' },
    {
      action: 'update',
      subject: 'User',
      description: 'Update own user profile',
    },
    {
      action: 'read_all',
      subject: 'User',
      description: 'Read all users (admin)',
    },
    {
      action: 'update_any',
      subject: 'User',
      description: 'Update any user (admin)',
    },
    {
      action: 'delete_any',
      subject: 'User',
      description: 'Delete any user (admin)',
    },

    // Post permissions
    { action: 'create', subject: 'Post', description: 'Create a new post' },
    { action: 'read', subject: 'Post', description: 'Read posts' },
    { action: 'update', subject: 'Post', description: 'Update own post' },
    { action: 'delete', subject: 'Post', description: 'Delete own post' },
    {
      action: 'update_any',
      subject: 'Post',
      description: 'Update any post (admin/moderator)',
    },
    {
      action: 'delete_any',
      subject: 'Post',
      description: 'Delete any post (admin/moderator)',
    },

    // Comment permissions
    { action: 'create', subject: 'Comment', description: 'Create a comment' },
    { action: 'update', subject: 'Comment', description: 'Update own comment' },
    { action: 'delete', subject: 'Comment', description: 'Delete own comment' },

    // ChatRoom permissions
    {
      action: 'create',
      subject: 'ChatRoom',
      description: 'Create a chat room',
    },
    {
      action: 'join',
      subject: 'ChatRoom',
      description: 'Join a public chat room',
    },
    { action: 'leave', subject: 'ChatRoom', description: 'Leave a chat room' },
    {
      action: 'manage_own',
      subject: 'ChatRoom',
      description: 'Manage own chat room (update, delete)',
    },
  ];

  for (const pData of permissionsData) {
    await prisma.permission.upsert({
      where: {
        action_subject: { action: pData.action, subject: pData.subject },
      },
      update: { description: pData.description },
      create: pData,
    });
  }
  console.log('Permissions seeded.');

  // Assign all permissions to ADMIN role
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id },
      },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }

  // Assign basic permissions to USER role
  const userPermissionsNames = [
    { action: 'read', subject: 'User' },
    { action: 'update', subject: 'User' },
    { action: 'create', subject: 'Post' },
    { action: 'read', subject: 'Post' },
    { action: 'update', subject: 'Post' }, // Assuming users can update their own posts
    { action: 'delete', subject: 'Post' }, // Assuming users can delete their own posts
    { action: 'create', subject: 'Comment' },
    { action: 'update', subject: 'Comment' },
    { action: 'delete', subject: 'Comment' },
    { action: 'create', subject: 'ChatRoom' },
    { action: 'join', subject: 'ChatRoom' },
    { action: 'leave', subject: 'ChatRoom' },
    { action: 'manage_own', subject: 'ChatRoom' },
  ];

  for (const permName of userPermissionsNames) {
    const perm = await prisma.permission.findUnique({
      where: { action_subject: permName },
    });
    if (perm) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: userRole.id, permissionId: perm.id },
        },
        update: {},
        create: { roleId: userRole.id, permissionId: perm.id },
      });
    }
  }
  console.log('Role-Permissions assignments seeded.');

  // Seed Admin User
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'password123';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await hash(adminPassword);
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin User',
        password: hashedPassword,
        isActive: true,
      },
    });

    // Assign ADMIN role to admin user
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: adminRole.id,
        assignedBy: 'system_seed',
      },
    });
    console.log(`Admin user created with email: ${adminEmail}`);
  } else {
    console.log(`Admin user with email: ${adminEmail} already exists.`);
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
