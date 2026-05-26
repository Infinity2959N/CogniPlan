export type TopicStatus = "critical" | "due" | "learning" | "mastered";

export interface Topic {
  id: string;
  title: string;
  subject: string;
  status: TopicStatus;
  lastReviewed: Date;
  nextReview: Date;
  easeFactor: number;
  repetitions: number;
  interval: number;
  isGroup?: boolean;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  topics: Topic[];
}

export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  streak: number;
  totalMastered: number;
  dueToday: number;
}

export interface SessionStats {
  dueToday: number;
  totalMastered: number;
  currentStreak: number;
}

export interface TopicCardProps {
  title: string;
  subject: string;
  status: TopicStatus;
  lastReviewed: Date;
  onReview: (score: number) => void;
  isGroup?: boolean;
}

export interface BadgeProps {
  label: string;
  variant: TopicStatus | "default";
}

export interface ButtonProps {
  label?: string;
  variant?: "primary" | "ghost" | "danger" | "score";
  size?: "sm" | "md" | "lg";
  score?: number;
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export interface InputFieldProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password" | "search";
  error?: string;
  className?: string;
}

export interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent?: "blue" | "green" | "yellow" | "red";
}