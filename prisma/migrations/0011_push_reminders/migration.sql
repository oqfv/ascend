-- Phone/browser notifications. One row per device a user turned notifications on for.
CREATE TABLE "push_subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "device" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMPTZ(3),
    CONSTRAINT "push_subscription_pkey" PRIMARY KEY ("id"),
    CONSTRAINT push_subscription_endpoint CHECK ("endpoint" LIKE 'https://%' AND length("endpoint") <= 1000)
);
CREATE UNIQUE INDEX "push_subscription_endpoint_key" ON "push_subscription"("endpoint");
CREATE INDEX "push_subscription_userId_idx" ON "push_subscription"("userId");

-- Reminders already sent, so each one goes out at most once a day.
CREATE TABLE "reminder_sent" (
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "key" TEXT NOT NULL,
    "sentAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reminder_sent_pkey" PRIMARY KEY ("userId", "date", "key")
);

ALTER TABLE "push_subscription" ADD CONSTRAINT "push_subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reminder_sent" ADD CONSTRAINT "reminder_sent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same protection as every other table: no Data API access, the app role only.
ALTER TABLE "push_subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reminder_sent" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "push_subscription", "reminder_sent" TO ascend_app;
CREATE POLICY app_server_access ON "push_subscription" FOR ALL TO ascend_app USING (true) WITH CHECK (true);
CREATE POLICY app_server_access ON "reminder_sent" FOR ALL TO ascend_app USING (true) WITH CHECK (true);
