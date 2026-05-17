import Image from "next/image";

const stickers = [
  {
    src: "/decor/chiikawa-01.png",
    className:
      "left-2 top-32 w-20 -rotate-6 opacity-45 sm:w-32 md:opacity-55 lg:left-8 lg:top-36 lg:w-40",
    delay: "0s",
  },
  {
    src: "/decor/chiikawa-02.png",
    className:
      "right-2 top-44 hidden w-28 rotate-6 opacity-50 md:block lg:right-8 lg:top-48 lg:w-44",
    delay: "1.2s",
  },
  {
    src: "/decor/chiikawa-03.png",
    className:
      "bottom-20 left-2 hidden w-28 rotate-3 opacity-45 md:block lg:bottom-28 lg:left-10 lg:w-44",
    delay: "2s",
  },
  {
    src: "/decor/chiikawa-04.png",
    className:
      "bottom-40 right-2 w-20 rotate-[-5deg] opacity-45 sm:w-32 md:opacity-55 lg:right-10 lg:w-44",
    delay: "0.6s",
  },
  {
    src: "/decor/chiikawa-05.png",
    className:
      "left-1/2 top-[58%] hidden w-28 -translate-x-1/2 rotate-2 opacity-35 xl:block xl:w-48",
    delay: "1.6s",
  },
];

export default function KawaiiDecor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[15] overflow-hidden"
    >
      {stickers.map((sticker, index) => (
        <div
          key={sticker.src}
          className={`absolute select-none ${sticker.className}`}
        >
          <div className="kawaii-float" style={{ animationDelay: sticker.delay }}>
            <Image
              src={sticker.src}
              alt=""
              width={320}
              height={320}
              priority={index < 2}
              sizes="(max-width: 640px) 96px, (max-width: 1024px) 160px, 192px"
              className="h-auto w-full rounded-[2rem] drop-shadow-[0_18px_40px_rgba(255,91,110,0.18)]"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
