# Simple Tasks API

A modern, full-stack task management API built with **Elysia**, **Bun**, **Prisma**, and **SQLite**. Features user authentication, task CRUD operations, and profile management with image uploads.

## 🚀 Features

- **🔐 User Authentication** - JWT-based login/register system
- **📝 Task Management** - Create, read, update, and delete tasks
- **🔍 Advanced Filtering** - Filter tasks by date and search by title
- **👤 User Profiles** - Profile management with image uploads
- **📊 Task Statistics** - Track total and completed tasks
- **📚 API Documentation** - Auto-generated Swagger/OpenAPI docs

## 🛠 Tech Stack

- **Framework**: [Elysia](https://elysiajs.com/) - Fast, type-safe web framework
- **Runtime**: [Bun](https://bun.sh/) - All-in-one JavaScript runtime
- **Database**: **SQLite** with [Prisma](https://www.prisma.io/) ORM
- **Authentication**: JWT tokens with bcrypt password hashing
- **Documentation**: [@elysiajs/swagger](https://github.com/elysiajs/elysia-swagger)
- **File Uploads**: Multipart form data support

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh/) installed

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/simple_tasks.git
cd simple_tasks

# Install dependencies
bun install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
bun run dev
```

### Environment Setup
Create a `.env` file (optional for SQLite):
```env
JWT_SECRET=your-secret-key-here
```

## 🌐 API Endpoints

### Authentication
- `POST /register` - User registration
- `POST /login` - User login

### Tasks
- `POST /tasks` - Create a new task
- `GET /tasks` - Get user tasks (with optional date/search filters)
- `PATCH /tasks/:id` - Update a task
- `DELETE /tasks/:id` - Delete a task

### Profile
- `GET /profile` - Get user profile and statistics
- `POST /profile/image` - Upload profile image

## 🌐 Deployment

### Render (Recommended)
This project is optimized for single-instance deployment on Render:

1. **Connect your GitHub repository**
2. **Set build command**: `npx prisma generate && npx prisma migrate deploy && bun install`
3. **Set start command**: `bun run src/index.ts`
4. **Deploy!** 🚀

### Other Platforms
- **Railway**: Supports Bun and SQLite out of the box
- **Fly.io**: Docker-based deployment
- **Vercel**: Node.js compatibility (may need adjustments)

## 📁 Project Structure

```
simple_tasks/
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── migrations/        # Database migrations
│   └── dev.db            # SQLite database
├── src/
│   ├── index.ts          # Main application file
│   └── generated/        # Generated Prisma client
├── uploads/              # User uploaded images
├── package.json
└── README.md
```

## 🔧 Development

### Available Scripts
```bash
bun run dev          # Start development server with hot reload
bun run src/index.ts # Start production server
```

### Database Commands
```bash
npx prisma generate  # Generate Prisma client
npx prisma migrate dev # Create and apply migrations
npx prisma studio    # Open Prisma Studio (database GUI)
```

## 📚 API Documentation

Once running, visit `http://localhost:3000/swagger` for interactive API documentation.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Elysia](https://elysiajs.com/) for the amazing web framework
- [Bun](https://bun.sh/) for the fast JavaScript runtime
- [Prisma](https://www.prisma.io/) for the excellent ORM
- [Render](https://render.com/) for seamless deployment

---

**Built with ❤️ using modern web technologies**