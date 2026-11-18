'use client';

import Image from 'next/image';
import { useState } from 'react';

/** eBay-style photo gallery: main image with a thumbnail strip. */
export function Gallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  return (
    <div>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {current ? (
          <Image
            src={current}
            alt={title}
            fill
            priority
            className="object-contain"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-sm text-gray-400">
            No image available
          </span>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={`${img}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View photo ${i + 1}`}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 ${
                i === active ? 'border-blue-600' : 'border-transparent hover:border-gray-300'
              }`}
            >
              <Image
                src={img}
                alt=""
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
