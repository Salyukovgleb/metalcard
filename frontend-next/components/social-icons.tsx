type SocialType = "instagram" | "tiktok" | "telegram";

export const socialLinks: Array<{ type: SocialType; href: string; label: string }> = [
  {
    type: "instagram",
    href: "https://www.instagram.com/metalcards.uz?utm_medium=copy_link",
    label: "Instagram",
  },
  {
    type: "tiktok",
    href: "http://tiktok.com/@metalcardsuz",
    label: "TikTok",
  },
  {
    type: "telegram",
    href: "https://t.me/metalcardsuz",
    label: "Telegram",
  },
];

export function SocialIcon({ type }: { type: SocialType }) {
  if (type === "instagram") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1.2" />
      </svg>
    );
  }

  if (type === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14 3v11.2a4.2 4.2 0 1 1-4.2-4.2" />
        <path d="M14 5.6c1.2 2.2 2.7 3.4 5 3.6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 4.5 3.8 11.2c-.9.4-.9 1.6.1 1.9l4.1 1.3 1.7 5c.3.9 1.4 1 1.9.2l2.3-3.4 4.3 3.1c.8.6 1.9.1 2.1-.9L22 5.7c.1-.8-.4-1.5-1-1.2Z" />
      <path d="m8 14.4 9.6-6.2-7.9 8.8" />
    </svg>
  );
}

export function SocialIconLinks({
  className,
  linkClassName,
}: {
  className: string;
  linkClassName: string;
}) {
  return (
    <div className={className}>
      {socialLinks.map((link) => (
        <a key={link.type} className={linkClassName} href={link.href} target="_blank" rel="noreferrer" aria-label={link.label}>
          <SocialIcon type={link.type} />
        </a>
      ))}
    </div>
  );
}
