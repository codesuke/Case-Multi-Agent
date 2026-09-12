"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";

/** Decorative GSAP scene, intentionally isolated from Framer Motion UI state. */
export function InvestigationAtmosphere() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const context = gsap.context(() => {
      gsap.to(".atmosphere-seal", { rotate: 8, y: -10, duration: 5, repeat: -1, yoyo: true, ease: "sine.inOut" });
    }, root);
    return () => context.revert();
  }, []);

  return <div ref={root} className="pointer-events-none fixed right-5 top-5 z-10 hidden lg:block" aria-hidden="true"><div className="atmosphere-seal grid size-14 place-items-center rounded-full border border-[#f4b941]/25 bg-[#24160e]/80 font-serif text-sm text-[#f4b941]/55">S</div></div>;
}
