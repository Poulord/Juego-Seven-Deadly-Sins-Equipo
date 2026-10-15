import { useState } from "react";
import { safeImage } from "./catalog";
export default function Portrait({
  src,
  name,
  className = "",
}: {
  src?: string;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const url = safeImage(src);
  return url && !failed ? (
    <img
      className={className}
      src={url}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : (
    <span
      className={`portrait-fallback ${className}`}
      role="img"
      aria-label={name}
    >
      {name.slice(0, 1)}
      <small>✦</small>
    </span>
  );
}
