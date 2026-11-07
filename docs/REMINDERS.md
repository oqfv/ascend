# Habit reminders (phone/browser notifications)

Ascend sends a Web Push notification at each habit's reminder time, in the user's own time zone,
unless the habit is already done. Each reminder goes out at most once a day.

## How it fits together

- `public/sw.js` – the service worker that shows notifications and opens Ascend when one is tapped.
- Settings → Notifications (`src/components/settings/push-settings.tsx`) – turns them on or off per device.
  Subscriptions are saved in `push_subscription` (migration 0011). Only addresses on the browsers' own
  push services are accepted (`isAllowedPushEndpoint`), so the server can't be made to call other addresses.
- `/api/cron/reminders` – works out who is due and sends. It needs `Authorization: Bearer <CRON_SECRET>`.
  Sent reminders are recorded in `reminder_sent`, so overlapping runs never send one twice.

## Environment variables

| Name | What |
| --- | --- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public push key (safe to show in the browser) |
| `VAPID_PRIVATE_KEY` | Private push key. Secret. |
| `VAPID_SUBJECT` | `mailto:` contact for the push services |
| `CRON_SECRET` | Already used by the monthly report |

Generate a key pair with `npx web-push generate-vapid-keys`. Changing the keys later turns notifications
off on every device, so set them once.

## The scheduler (every 5 minutes)

Vercel's free plan only runs scheduled jobs once a day, so Supabase calls the route instead.
Run this once in the Supabase SQL editor of the live project, replacing `PASTE_CRON_SECRET` with the
same value as `CRON_SECRET` in Vercel:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret('PASTE_CRON_SECRET', 'ascend_cron_secret');

select cron.schedule(
  'ascend-reminders',
  '*/5 * * * *',
  $$
  select net.http_get(
    url := 'https://ascend-tracker.me/api/cron/reminders',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'ascend_cron_secret')
    ),
    timeout_milliseconds := 30000
  );
  $$
);
```

To stop it: `select cron.unschedule('ascend-reminders');`
To see recent runs: `select * from net._http_response order by created desc limit 10;`
