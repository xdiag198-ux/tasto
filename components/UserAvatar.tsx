export function initials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return letters || "?";
}

type Props = {
  name: string;
  url?: string | null;
  size?: string;
  className?: string;
};

export function UserAvatar({ name, url, size = "w-11 h-11", className = "" }: Props) {
  return (
    <div
      className={`${size} ${className} shrink-0 rounded-full bg-surface-2 border border-border flex items-center justify-center text-foreground font-semibold text-xs shadow-noir overflow-hidden`}
    >
      {url ? (
        <img
          src={url}
          alt={name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      ) : (
        initials(name)
      )}
    </div>
  );
}
