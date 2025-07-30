import { Elysia, t } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from './generated/prisma';

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
  // Login/Register (Auto-register if user doesn't exist)
  .post('/login', async ({ body, status }) => {
    const { email, password } = body as { email: string; password: string };
    if (!email || !password) return status(400, { error: 'Email and password required' });

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (!existingUser) {
      // User doesn't exist - register them
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await prisma.user.create({
        data: { email, password: hashedPassword, image: '' }
      });
      const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
      return { token };
    } else {
      // User exists - verify password and login
      const valid = await bcrypt.compare(password, existingUser.password);
      if (!valid) return status(400, { error: 'Invalid credentials' });
      const token = jwt.sign({ id: existingUser.id, email: existingUser.email }, JWT_SECRET, { expiresIn: '7d' });
      return { token };
    }
  }, {
    body: t.Object({ email: t.String(), password: t.String() }),
    response: {
      200: t.Object({
        token: t.String(),
      }),
      400: t.Object({ error: t.String() })
    }
  })

  // Create Task
  .post('/tasks', async ({ body, headers, status }) => {
    const authHeader = headers['authorization'];
    const token = authHeader?.split(' ')[1];
    const userPayload = getUserFromToken(token);
    if (!userPayload) return status(401, { error: 'Unauthorized' });
    const { title, date, isChecked } = body as { title: string; date: string; isChecked: boolean };
    if (!title || !date || typeof isChecked !== 'boolean') return status(400, { error: 'Invalid task data' });
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
    response: {
      200: t.Object({
        task: t.Object({
          id: t.Number(),
          userId: t.Number(),
          title: t.String(),
          date: t.String(),
          isChecked: t.Boolean()
        })
      }),
      400: t.Object({ error: t.String() }),
      401: t.Object({ error: t.String() })
    }
  })

  // Fetch Tasks (with filter)
  .get('/tasks', async ({ headers, query, status }) => {
    const authHeader = headers['authorization'];
    const token = authHeader?.split(' ')[1];
    const userPayload = getUserFromToken(token);
    if (!userPayload) return status(401, { error: 'Unauthorized' });
    const { date, search } = query as { date?: string; search?: string };
    let where: any = { userId: userPayload.id };
    if (date) where.date = date;
    if (search) where.title = { contains: search, mode: 'insensitive' };
    const tasks = await prisma.task.findMany({ where });
    return { tasks };
  }, {
    query: t.Object({ date: t.Optional(t.String()), search: t.Optional(t.String()) }),
    response: {
      200: t.Object({
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
      401: t.Object({ error: t.String() })
    }
  })

  // Patch Task
  .patch('/tasks/:id', async ({ headers, body, params, status }) => {
    const authHeader = headers['authorization'];
    const token = authHeader?.split(' ')[1];
    const userPayload = getUserFromToken(token);
    if (!userPayload) return status(401, { error: 'Unauthorized' });
    const id = Number(params.id);
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.userId !== userPayload.id) return status(404, { error: 'Task not found' });
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
    response: {
      200: t.Object({
        task: t.Object({
          id: t.Number(),
          userId: t.Number(),
          title: t.String(),
          date: t.String(),
          isChecked: t.Boolean()
        })
      }),
      401: t.Object({ error: t.String() }),
      404: t.Object({ error: t.String() })
    }
  })

  // Profile
  .get('/profile', async ({ headers, status }) => {
    const authHeader = headers['authorization'];
    const token = authHeader?.split(' ')[1];
    const userPayload = getUserFromToken(token);
    if (!userPayload) return status(401, { error: 'Unauthorized' });
    const user = await prisma.user.findUnique({ where: { id: userPayload.id }, include: { tasks: true } });
    if (!user) return status(404, { error: 'User not found' });
    const stats = {
      total: user.tasks.length,
      completed: user.tasks.filter((task: { isChecked: boolean }) => task.isChecked).length
    };
    return { email: user.email, image: user.image, stats };
  }, {
    response: {
      200: t.Object({
        email: t.String(),
        image: t.String(),
        stats: t.Object({
          total: t.Number(),
          completed: t.Number()
        })
      }),
      401: t.Object({ error: t.String() }),
      404: t.Object({ error: t.String() })
    }
  })

  .post('/profile/image', async ({ headers, body, status }) => {
    const authHeader = headers['authorization'];
    const token = authHeader?.split(' ')[1];
    const userPayload = getUserFromToken(token);
    if (!userPayload) return status(401, { error: 'Unauthorized' });

    // Accept file upload
    const file = body.image;
    if (!file || !file.name) {
      return status(400, { error: 'No image file uploaded' });
    }

    // Ensure uploads directory exists
    const fs = await import('fs/promises');
    const path = await import('path');
    const uploadsDir = path.join(process.cwd(), 'uploads');
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
    } catch { }

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
    response: {
      200: t.Object({ message: t.String(), image: t.String() }),
      400: t.Object({ error: t.String() }),
      401: t.Object({ error: t.String() })
    }
  })

  .listen(PORT);

console.log(`🦊 Elysia is running at http://localhost:${PORT}`);
