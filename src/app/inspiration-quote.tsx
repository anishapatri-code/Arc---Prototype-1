"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

const quote = "It gets easier. Every day it gets a little easier. But you gotta do it every day—that’s the hard part. But it does get easier.";

export default function InspirationQuote() {
  const ref = useRef<HTMLElement>(null);
  const replay = useRef<() => void>(() => {});

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const words = Array.from(element.querySelectorAll<HTMLElement>(".quote-word"));
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animations: Animation[] = [];
    let frame = 0;
    let disposed = false;

    const play = () => {
      animations.forEach(animation => animation.cancel());
      animations = [];
      if (motion.matches) {
        words.forEach(word => { word.style.opacity = "1"; });
        return;
      }
      words.forEach(word => { word.style.opacity = "0"; });
      animations = words.map((word, index) => word.animate(
        [{ opacity: 0, transform: "translateY(28px)", filter: "blur(8px)" },
         { opacity: 1, transform: "translateY(0)", filter: "blur(0)" }],
        { duration: 1100, delay: 650 + index * 130, easing: "cubic-bezier(.2,.7,.2,1)", fill: "both" },
      ));
    };
    replay.current = play;
    // Start after hydration and font loading so the entrance isn't over before the app is ready.
    const start = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { if (!disposed) play(); });
    };
    void document.fonts.ready.then(() => { if (!disposed) start(); });
    const onVisibility = () => { if (document.visibilityState === "visible") start(); };
    const onPageShow = (event: PageTransitionEvent) => { if (event.persisted) start(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    motion.addEventListener("change", start);
    return () => {
      disposed = true;
      replay.current = () => {};
      cancelAnimationFrame(frame);
      animations.forEach(animation => animation.cancel());
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
      motion.removeEventListener("change", start);
    };
  }, []);

  return <figure ref={ref} className="inspiration">
    <Image className="winter-hero-image" src="/indian-winter-hero.png" alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1200px) 80vw, 1200px" preload />
    <div className="winter-hero-shade" aria-hidden="true" />
    <span className="inspiration-mark" aria-hidden="true">“</span>
    <blockquote aria-label={quote}>
      <span aria-hidden="true">{quote.split(" ").map((word, index) => <span key={index}><span className="quote-word">{word}</span>{" "}</span>)}</span>
    </blockquote>
    <button type="button" className="quote-replay" aria-label="Replay quote animation" title="Replay quote animation" onClick={() => replay.current()}>↻</button>
  </figure>;
}
