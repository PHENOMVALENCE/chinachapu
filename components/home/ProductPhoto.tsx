"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  url?: string | null;
  alt: string;
  priority?: boolean;
};

export default function ProductPhoto({ url, alt, priority = false }: Props) {
  const [failed, setFailed] = useState(false);
  const local = Boolean(url?.startsWith("/catalogue/"));

  return (
    <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-[136px]">
      {url && !failed ? (
        <Image
          src={url}
          alt={alt}
          fill
          sizes="(max-width: 640px) 80px, 136px"
          className="object-contain"
          priority={priority}
          unoptimized={!local}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] leading-snug text-muted-foreground">
          Photo unavailable
        </div>
      )}
    </div>
  );
}
