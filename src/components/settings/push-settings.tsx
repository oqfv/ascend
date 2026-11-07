"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Bell, BellOff, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeAllPushSubscriptions, removePushSubscription, savePushSubscription, sendTestPush } from "@/app/(app)/settings/push-actions";

type State = "loading" | "unsupported" | "ios-needs-home-screen" | "blocked" | "off" | "on";

const KEY = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim();

function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const b64 = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** A short, non-identifying name for the device, so the user can tell their devices apart. */
function deviceName(): string {
  const ua = navigator.userAgent;
  const os = /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "Mac" : "Device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "browser";
  return `${os}, ${browser}`;
}

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

async function registration() {
  return (await navigator.serviceWorker.getRegistration("/")) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
}

/** Turn phone/browser notifications on or off for this device, and send a test. */
export function PushSettings({ devices }: { devices: number }) {
  const [state, setState] = useState<State>("loading");
  const [pending, start] = useTransition();

  useEffect(() => {
    (async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) return setState(isIOS() && !isStandalone() ? "ios-needs-home-screen" : "unsupported");
      if (Notification.permission === "denied") return setState("blocked");
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  function turnOn() {
    start(async () => {
      try {
        if (!KEY) throw new Error("Notifications aren't set up on this server yet.");
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setState(permission === "denied" ? "blocked" : "off");
          toast.error("Notifications weren't allowed.");
          return;
        }
        const reg = await registration();
        await navigator.serviceWorker.ready;
        const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY) }));
        const json = sub.toJSON();
        const res = await savePushSubscription({ endpoint: json.endpoint, keys: json.keys, device: deviceName() });
        if (!res.ok) {
          await sub.unsubscribe().catch(() => {});
          toast.error(res.error);
          return;
        }
        setState("on");
        toast.success("Notifications are on for this device.");
      } catch (e) {
        toast.error(e instanceof Error && e.message.startsWith("Notifications") ? e.message : "This browser couldn't turn notifications on. Try again, or use another browser.");
      }
    });
  }

  function turnOff() {
    start(async () => {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe().catch(() => {});
      }
      setState("off");
      toast.success("Notifications are off for this device.");
    });
  }

  function test() {
    start(async () => {
      const res = await sendTestPush();
      if (res.ok) toast.success("Sent. It should pop up in a few seconds.");
      else toast.error(res.error);
    });
  }

  function offEverywhere() {
    start(async () => {
      const reg = await navigator.serviceWorker?.getRegistration("/");
      await (await reg?.pushManager.getSubscription())?.unsubscribe().catch(() => {});
      await removeAllPushSubscriptions();
      if (state === "on") setState("off");
      toast.success("Notifications are off on all your devices.");
    });
  }

  return (
    <div className="grid gap-3">
      <p className="text-muted-foreground">
        Get a notification at each habit&apos;s reminder time, unless it&apos;s already done. Set the time when you add or edit a habit.
      </p>

      {state === "loading" && <p className="text-sm text-muted-foreground">Checking this device…</p>}

      {state === "ios-needs-home-screen" && (
        <p className="rounded-xl bg-data-soft px-4 py-3">
          On iPhone, add Ascend to your Home Screen first: tap <span className="font-medium">Share</span>, then{" "}
          <span className="font-medium">Add to Home Screen</span>. Open Ascend from there and come back to this page.
        </p>
      )}

      {state === "unsupported" && <p className="rounded-xl bg-surface-strong px-4 py-3">This browser can&apos;t show notifications. Try Chrome, Edge, Firefox or Safari.</p>}

      {state === "blocked" && (
        <p className="rounded-xl bg-surface-strong px-4 py-3">
          Notifications are blocked for Ascend in this browser. Allow them in the browser&apos;s site settings (the icon next to the address), then reload this page.
        </p>
      )}

      {state === "off" && (
        <div>
          <Button onClick={turnOn} disabled={pending}>
            <Bell /> {pending ? "Turning on…" : "Turn on for this device"}
          </Button>
        </div>
      )}

      {state === "on" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 inline-flex items-center gap-1.5 font-medium">
            <Bell className="size-4" aria-hidden="true" /> On for this device
          </span>
          <Button variant="secondary" onClick={test} disabled={pending}>
            <Send /> Send a test
          </Button>
          <Button variant="ghost" onClick={turnOff} disabled={pending}>
            <BellOff /> Turn off
          </Button>
        </div>
      )}

      {devices > 0 && (
        <p className="text-sm text-muted-foreground">
          On for {devices} {devices === 1 ? "device" : "devices"}.{" "}
          {devices > 1 || state !== "on" ? (
            <button type="button" onClick={offEverywhere} disabled={pending} className="font-medium text-foreground underline underline-offset-4">
              Turn off everywhere
            </button>
          ) : null}
        </p>
      )}
    </div>
  );
}
