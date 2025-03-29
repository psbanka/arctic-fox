set -e
set -x

psql postgres -f db-setup.sql
DATABASE_URL=postgres://app_user:app_password@localhost:5432/family_tasks npx drizzle-kit generate
bun db:migrate
bun db:seed

