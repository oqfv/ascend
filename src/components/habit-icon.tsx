import {
  Apple,
  Bike,
  BookOpen,
  Brain,
  Code,
  Droplet,
  Dumbbell,
  Footprints,
  GraduationCap,
  HeartPulse,
  Leaf,
  Moon,
  Music,
  Pencil,
  PiggyBank,
  Sun,
  type LucideIcon,
} from "lucide-react";
import type { HabitIcon as HabitIconName } from "@/lib/constants";

export const ICONS: Record<HabitIconName, LucideIcon> = {
  "book-open": BookOpen,
  dumbbell: Dumbbell,
  footprints: Footprints,
  droplet: Droplet,
  moon: Moon,
  brain: Brain,
  pencil: Pencil,
  "graduation-cap": GraduationCap,
  "heart-pulse": HeartPulse,
  apple: Apple,
  "piggy-bank": PiggyBank,
  code: Code,
  music: Music,
  sun: Sun,
  bike: Bike,
  leaf: Leaf,
};

export function HabitIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = name ? ICONS[name as HabitIconName] : null;
  return Icon ? <Icon className={className} aria-hidden="true" /> : null;
}
