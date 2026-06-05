import Link from "next/link";

const letters: { char: string; href: string | null; label?: string }[] = [
  { char: "D", href: "/collections/tableware", label: "Tableware" },
  { char: "A", href: "/collections/vases", label: "Vases" },
  { char: "Y", href: null },
];

export default function Home() {
  return (
    <main className="flex h-screen snap-y snap-mandatory flex-col overflow-y-auto bg-[#F8F5EE] md:snap-none md:flex-row md:justify-center md:gap-12 md:overflow-hidden">
      <h1 className="sr-only">Day Day Ceramics</h1>
      {letters.map(({ char, href, label }) => {
        const letter = (
          <span
            aria-hidden
            className="block leading-none text-[#413E3F] select-none font-[family-name:var(--font-anton)]"
            style={{
              // Anton cap-height is ~0.859em; size so the cap (x scaleY) leaves ~30px top/bottom.
              fontSize: "calc((100vh - 60px) / 1.074)",
              transform: "scaleY(1.25)",
            }}
          >
            {char}
          </span>
        );

        return (
          <section
            key={char}
            className="flex h-screen w-full shrink-0 snap-start items-center justify-center overflow-hidden bg-[#F8F5EE] md:h-full md:w-auto md:flex-none"
          >
            {href ? (
              <Link href={href} aria-label={label} className="group inline-flex">
                {letter}
              </Link>
            ) : (
              <span className="group inline-flex">{letter}</span>
            )}
          </section>
        );
      })}
    </main>
  );
}
