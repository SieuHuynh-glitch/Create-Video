// Nạp 2 font Google tối ưu hiển thị tiếng Việt và sắc nét ở độ phân giải 1080p
export const headingFont = "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
export const bodyFont = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

// Tự động nhúng font từ Google Fonts CDN khi chạy trong môi trường browser/Chromium
if (typeof document !== "undefined") {
  const fontLinkId = "google-fonts-remotion-factory";
  if (!document.getElementById(fontLinkId)) {
    const link = document.createElement("link");
    link.id = fontLinkId;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@500;600;700;800;900&display=swap";
    document.head.appendChild(link);
  }
}

export const theme = {
  colors: {
    bg: {
      primary: "#0B0F19",
      secondary: "#111827",
      gradient: "linear-gradient(135deg, #0B0F19 0%, #111827 50%, #1E1B4B 100%)",
      surface: "rgba(30, 41, 59, 0.75)",
      surfaceBorder: "rgba(255, 255, 255, 0.12)",
    },
    text: {
      primary: "#F8FAFC",
      secondary: "#CBD5E1",
      muted: "#94A3B8",
      accent: "#38BDF8",     // Electric Cyan
      highlight: "#F59E0B",  // Warm Amber / Gold
      gradient: "linear-gradient(90deg, #38BDF8 0%, #818CF8 100%)",
    },
    accent: {
      cyan: "#38BDF8",
      indigo: "#818CF8",
      amber: "#F59E0B",
      emerald: "#10B981",
      glowCyan: "0 0 40px rgba(56, 189, 248, 0.35)",
      glowAmber: "0 0 40px rgba(245, 158, 11, 0.35)",
    },
  },
  typography: {
    headingFont,
    bodyFont,
    sizes: {
      hero: 96,
      title: 72,
      statNumber: 128,
      subtitle: 48,
      body: 48,
      caption: 48, // Đảm bảo tối thiểu 48px theo video_rules.md
    },
    lineHeights: {
      tight: 1.15,
      normal: 1.35,
      relaxed: 1.5,
    },
  },
  layout: {
    width: 1920,
    height: 1080,
    safePadding: 96, // Safe zone padding an toàn
    borderRadius: 24,
    cardPadding: 48,
  },
} as const;
