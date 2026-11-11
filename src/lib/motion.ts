import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { RefObject } from "react";

gsap.registerPlugin(ScrollTrigger, CustomEase);
CustomEase.create("ref", "0.22,1,0.36,1"); // the reference site's signature ease

export const q = <T extends HTMLElement>(r: RefObject<T>) => r.current as T;

/** Type `text` into an element over `dur` seconds, starting at `at` on the timeline. */
export function typeTo(tl: gsap.core.Timeline, el: HTMLElement, text: string, at: number | string, dur: number) {
  const o = { n: 0 };
  tl.to(o, { n: text.length, duration: dur, ease: "none", onUpdate: () => void (el.textContent = text.slice(0, Math.round(o.n))) }, at);
}

/** Vermilion flash over a result. immediateRender: false so the flash is not painted before it plays. */
export function flash(tl: gsap.core.Timeline, el: HTMLElement, at: number | string) {
  tl.fromTo(el, { opacity: 0.4 }, { opacity: 0, duration: 0.45, ease: "ref", immediateRender: false }, at);
}
