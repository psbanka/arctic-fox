# Family Task Manager

A task management tool for families, built with TypeScript, React, Hono, Drizzle, and PostgreSQL.

## Features

- Template-based monthly task planning
- Track tasks with Fibonacci-based story points
- Multiple household members with different access levels
- Monthly task reporting and progress tracking
- Mobile-friendly interface
- User authentication and admin dashboard

## Tech Stack

- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Backend**: Hono (lightweight web framework), Drizzle ORM
- **Database**: PostgreSQL
- **Tools**: Bun, Biome, MSW (for API mocking)
- **Testing**: Vitest, Playwright

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (for package management and running the app)
- [PostgreSQL](https://www.postgresql.org/) (for the database)

### Setup

1. Clone the repository:

```bash
git clone https://github.com/yourusername/family-task-manager.git
cd family-task-manager
```

2. Install dependencies:

```bash
bun install
```

3. Set up the database:

```bash
# Create a PostgreSQL database
createdb family_task_manager

# Generate and run migrations
bun run db:generate
bun run db:migrate

# Seed the database with initial data
bun run db:seed
```

4. Start the development server:

```bash
# Run both client and server
bun run dev

# Or separately
bun run dev:client
bun run dev:server
```

5. Visit `http://localhost:5173` in your browser

### Available Scripts

- `bun run dev` - Start the development server (client + server)
- `bun run dev:client` - Start the client development server
- `bun run dev:server` - Start the server development server
- `bun run build` - Build the client for production
- `bun run build:server` - Build the server for production
- `bun run lint` - Run Biome linting
- `bun run format` - Format code with Biome
- `bun run db:generate` - Generate database migrations
- `bun run db:migrate` - Run database migrations
- `bun run db:seed` - Seed the database with initial data
- `bun run test` - Run tests
- `bun run test:e2e` - Run end-to-end tests

## Demo Users

After running the seed script, the following users will be available:

- Admin user: `admin` / `admin123`
- Regular user: `john.doe` / `password123`
- Regular user: `jane.doe` / `password123`

## License

MIT
