-- Account recovery without email: one hashed, single-use recovery code per user.
CREATE TABLE "recovery_code" (
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "recovery_code_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "recovery_code" ADD CONSTRAINT "recovery_code_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same protection as every other table: no Data API access, the app role only.
ALTER TABLE "recovery_code" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "recovery_code" TO ascend_app;
CREATE POLICY app_server_access ON "recovery_code" FOR ALL TO ascend_app USING (true) WITH CHECK (true);
