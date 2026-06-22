import { useState } from "react";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  src?: string | null;
  fallback?: React.ReactNode;
};

export function SafeImage({ src, fallback, alt = "", className, ...rest }: Props) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div className={(className ?? "") + " flex items-center justify-center bg-muted text-4xl"}>
        {fallback ?? "🍫"}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      loading="lazy"
      onError={() => setErrored(true)}
      {...rest}
    />
  );
}