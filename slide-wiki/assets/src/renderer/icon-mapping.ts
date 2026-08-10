// Map Material Design Icon names to Unicode symbols for PPTX rendering
// PowerPoint doesn't support SVG well, so we use visually similar Unicode characters

export const MATERIAL_ICON_TO_UNICODE: Record<string, string> = {
  // Navigation & Actions
  home: "🏠",
  search: "🔍",
  settings: "⚙️",
  menu: "☰",
  close: "✕",
  check: "✓",
  check_circle: "✓",
  arrow_back: "←",
  arrow_forward: "→",
  arrow_upward: "↑",
  arrow_downward: "↓",

  // Communication
  email: "✉",
  phone: "☎",
  chat: "💬",
  message: "💬",
  notifications: "🔔",

  // Content
  add: "＋",
  remove: "−",
  edit: "✎",
  delete: "🗑",
  save: "💾",
  folder: "📁",
  file: "📄",
  attach_file: "📎",
  link: "🔗",

  // Common
  favorite: "★",
  star: "★",
  visibility: "👁",
  cloud: "☁",
  download: "⬇",
  upload: "⬆",
  refresh: "↻",
  sync: "⟳",
  lock: "🔒",
  unlock: "🔓",

  // Social
  person: "👤",
  people: "👥",
  group: "👥",
  share: "⤴",

  // Media
  play_arrow: "▶",
  pause: "⏸",
  stop: "⏹",
  volume_up: "🔊",
  volume_off: "🔇",

  // Time
  access_time: "🕐",
  schedule: "📅",
  today: "📅",

  // Status
  info: "ℹ",
  warning: "⚠",
  error: "⚠",
  help: "❓",
  done: "✓",

  // Business
  work: "💼",
  business: "💼",
  shopping_cart: "🛒",
  payment: "💳",

  // AI & Tech
  smart_toy: "🤖",
  psychology: "🧠",
  lightbulb: "💡",
  code: "💻",
  hub: "🔗",
  auto_awesome: "✨",
  bolt: "⚡",
  description: "📝",
  analytics: "📊",
  trending_up: "📈",
}

// Get Unicode symbol for a Material Icon name, or return a generic icon
export function getMaterialIconSymbol(iconName: string): string {
  return MATERIAL_ICON_TO_UNICODE[iconName] || "⬤"
}
