# jingot

A TypeScript-based backend API for the Jingot blog system (元宝博客后台接口系统). It uses Express, Sequelize (MySQL), Redis, and supports file uploads, image processing, and typical blog features (users, categories, tags, blogs, comments, photos).

## Features

...

## Requirements

- Node.js 18+ (recommend LTS)
- pnpm, npm, or yarn (pnpm recommended)
- MySQL server
- Redis server (optional but recommended for session/captcha caching)

## Quick start

1. Install dependencies

```bash
pnpm install
# or npm install
```

2. Create a .env file (see `.env.example` if present) and set database and redis credentials. Typical variables used by the project:

- NODE_ENV
- DATABASE_URL / DB_HOST / DB_USER / DB_PASS / DB_NAME
- REDIS_URL / REDIS_HOST / REDIS_PORT
- JWT_SECRET

3. Create and initialize the database (development)

```bash
pnpm run db:create
pnpm run db:init
```

4. Run migrations or seeders directly if needed

```bash
pnpm run migrate
pnpm run seed
```

5. Start in development mode

```bash
pnpm run dev
```

Build for production

```bash
pnpm run build
pnpm start
```

## Scripts

Key scripts are defined in `package.json`:

- `pnpm run dev` - start development server with nodemon (ts-node)
- `pnpm run build` - compile TypeScript to `dist`
- `pnpm start` - run the compiled server
- `pnpm run test` - run tests (Jest)
- `pnpm run lint` / `lint:fix` - ESLint
- `pnpm run format` - Prettier
- Database helper scripts: `db:create`, `db:drop`, `db:init`, `db:reset`, `db:refresh`, `migrate`, `seed`, and undo variants.

Refer to `package.json` for the full list of scripts and details.

## Configuration

Configuration is located under the `config/` directory. Environment-aware configuration uses `dotenv` / `dotenv-flow`.

## Database

This project uses Sequelize and stores migrations in `db/migrations` and seeders in `db/seeders`.

Run migrations with:

```bash
pnpm run migrate
```

And rollback:

```bash
pnpm run migrate:undo
pnpm run migrate:undo:all
```

## Testing

Run unit & integration tests with Jest:

```bash
pnpm test
pnpm run test:watch
pnpm run test:coverage
```

## Development notes

- Source code lives in `src/`.
- Compiled output is under `dist/` when built.
- Use `ts-node` and `tsconfig-paths` in dev to respect path aliases.

## Contributing

Contributions are welcome. Open an issue first to discuss larger changes. Please follow the existing code style and add tests for new features.

## License

MIT
