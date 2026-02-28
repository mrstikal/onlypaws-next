#!/usr/bin/env sh
set -eu

# Only create test users if running in E2E database
if [ "$POSTGRES_DB" != "onlypaws_next_e2e" ]; then
  exit 0
fi

echo "[init] Creating E2E test users in database '$POSTGRES_DB'..."

psql \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  <<EOF

-- Create test users with bcrypt hashed passwords
-- user1@example.com / Password123!
INSERT INTO users (name, email, password, role, created_at, updated_at)
VALUES (
  'Test User 1',
  'user1@example.com',
  '\$2b\$10\$krdBdXBVuZcTnFPgbdeYQO9x3tAhthB2NS2BXTm65gpvdauAIGtt2',
  'user',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- user2@example.com / Password456!
INSERT INTO users (name, email, password, role, created_at, updated_at)
VALUES (
  'Test User 2',
  'user2@example.com',
  '\$2b\$10\$gwyIB31HKwoHyaH3/rwQ9ea0uelOAKhRu0K7KwHjWoe6jTTcE25gC',
  'user',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

EOF

echo "[init] Test users created successfully."

