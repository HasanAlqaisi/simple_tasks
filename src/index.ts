import { Elysia, t } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();
const PORT = 3000;
const JWT_SECRET = 'supersecretkey'; // In production, use env vars

interface JwtUserPayload {
  id: number;
  email: string;
}

function getUserFromToken(token: string | undefined): JwtUserPayload | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtUserPayload;
    return decoded;
  } catch {
    return null;
  }
}

const app = new Elysia()
  .use(swagger({
    documentation: {
      info: {
        title: 'Simple Tasks API',
        version: '1.0.0',
        description: 'API for user authentication, task management, and profile with Elysia, Prisma, and Swagger.'
      }
    }
  }))
  // Register
  .post('/register', async ({ body }) => {
    const { email, password } = body as { email: string; password: string };
    if (!email || !password) return { error: 'Email and password required' };
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return { error: 'User exists' };
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({ data: { email, password: hashedPassword, image: '' } });
    return { message: 'Registered successfully' };
  }, {
    body: t.Object({ email: t.String(), password: t.String() }),
    response: t.Union([
      t.Object({ message: t.String() }),
      t.Object({ error: t.String() })
    ])
  })

  // Login
  .post('/login', async ({ body }) => {
    const { email, password } = body as { email: string; password: string };
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return { error: 'Invalid credentials' };
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return { error: 'Invalid credentials' };
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
    return { token };
  }, {
    body: t.Object({ email: t.String(), password: t.String() }),
    response: t.Union([
      t.Object({ token: t.String() }),
      t.Object({ error: t.String() })
    ])
  })

  // Create Task
  .post('/tasks', async ({ body, headers }) => {
    const authHeader = headers['authorization'];
    const token = authHeader?.split(' ')[1];
    const userPayload = getUserFromToken(token);
    if (!userPayload) return { error: 'Unauthorized' };
    const { title, date, isChecked } = body as { title: string; date: string; isChecked: boolean };
    if (!title || !date || typeof isChecked !== 'boolean') return { error: 'Invalid task data' };
    const task = await prisma.task.create({
      data: {
        title,
        date,
        isChecked,
        userId: userPayload.id
      }
    });
    return { task };
  }, {
    body: t.Object({ title: t.String(), date: t.String(), isChecked: t.Boolean() }),
    response: t.Union([
      t.Object({
        task: t.Object({
          id: t.Number(),
          userId: t.Number(),
          title: t.String(),
          date: t.String(),
          isChecked: t.Boolean()
        })
      }),
      t.Object({ error: t.String() })
    ])
  })

  // Fetch Tasks (with filter)
  .get('/tasks', async ({ headers, query }) => {
    const authHeader = headers['authorization'];
    const token = authHeader?.split(' ')[1];
    const userPayload = getUserFromToken(token);
    if (!userPayload) return { error: 'Unauthorized' };
    const { date, search } = query as { date?: string; search?: string };
    let where: any = { userId: userPayload.id };
    if (date) where.date = date;
    if (search) where.title = { contains: search, mode: 'insensitive' };
    const tasks = await prisma.task.findMany({ where });
    return { tasks };
  }, {
    query: t.Object({ date: t.Optional(t.String()), search: t.Optional(t.String()) }),
    response: t.Union([
      t.Object({
        tasks: t.Array(
          t.Object({
            id: t.Number(),
            userId: t.Number(),
            title: t.String(),
            date: t.String(),
            isChecked: t.Boolean()
          })
        )
      }),
      t.Object({ error: t.String() })
    ])
  })

  // Patch Task
  .patch('/tasks/:id', async ({ headers, body, params }) => {
    const authHeader = headers['authorization'];
    const token = authHeader?.split(' ')[1];
    const userPayload = getUserFromToken(token);
    if (!userPayload) return { error: 'Unauthorized' };
    const id = Number(params.id);
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.userId !== userPayload.id) return { error: 'Task not found' };
    const { title, date, isChecked } = body as { title?: string; date?: string; isChecked?: boolean };
    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(date !== undefined ? { date } : {}),
        ...(isChecked !== undefined ? { isChecked } : {})
      }
    });
    return { task: updated };
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      title: t.Optional(t.String()),
      date: t.Optional(t.String()),
      isChecked: t.Optional(t.Boolean())
    }),
    response: t.Union([
      t.Object({
        task: t.Object({
          id: t.Number(),
          userId: t.Number(),
          title: t.String(),
          date: t.String(),
          isChecked: t.Boolean()
        })
      }),
      t.Object({ error: t.String() })
    ])
  })

  // Profile
  .get('/profile', async ({ headers }) => {
    const authHeader = headers['authorization'];
    const token = authHeader?.split(' ')[1];
    const userPayload = getUserFromToken(token);
    if (!userPayload) return { error: 'Unauthorized' };
    const user = await prisma.user.findUnique({ where: { id: userPayload.id }, include: { tasks: true } });
    if (!user) return { error: 'User not found' };
    const stats = {
      total: user.tasks.length,
      completed: user.tasks.filter((task: { isChecked: boolean }) => task.isChecked).length
    };
    return { email: user.email, image: user.image, stats };
  }, {
    response: t.Union([
      t.Object({
        email: t.String(),
        image: t.String(),
        stats: t.Object({
          total: t.Number(),
          completed: t.Number()
        })
      }),
      t.Object({ error: t.String() })
    ])
  })

  .post('/profile/image', async ({ headers, body }) => {
    const authHeader = headers['authorization'];
    const token = authHeader?.split(' ')[1];
    const userPayload = getUserFromToken(token);
    if (!userPayload) return { error: 'Unauthorized' };

    // Accept file upload
    const file = body.image;
    if (!file || !file.name) {
      return { error: 'No image file uploaded' };
    }

    // Ensure uploads directory exists
    const fs = await import('fs/promises');
    const path = await import('path');
    const uploadsDir = path.join(process.cwd(), 'uploads');
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
    } catch {}

    // Generate unique filename
    const ext = path.extname(file.name);
    const filename = `user_${userPayload.id}_${Date.now()}${ext}`;
    const filepath = path.join(uploadsDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filepath, buffer);

    // Store relative path in DB
    const relativePath = `uploads/${filename}`;
    await prisma.user.update({ where: { id: userPayload.id }, data: { image: relativePath } });
    return { message: 'Image updated', image: relativePath };
  }, {
    body: t.Object({
      image: t.File({
        type: ['image/jpeg', 'image/png', 'image/gif'],
        maxSize: 5 * 1024 * 1024 // 5MB
      })
    }),
    response: t.Union([
      t.Object({ message: t.String(), image: t.String() }),
      t.Object({ error: t.String() })
    ])
  })

  .listen(PORT);

console.log(`🦊 Elysia is running at http://localhost:${PORT}`);
