"use client";

import { useEffect, useRef, useState } from "react";

const POSTER = "/login/arena-login-poster.webp";
const POSTER_MOBILE = "/login/arena-login-poster-mobile.webp";

/**
 * The scene behind the login card. A still poster today; pass `video` once a looping clip exists
 * (e.g. { webm: "/login/arena-login-video.webm", mp4: "/login/arena-login-video.mp4" }) and it
 * fades in over the poster after first paint, with no layout change. The video is skipped for
 * reduced motion and Save-Data, and paused while the tab is hidden.
 */
export function LoginBackground({ video }: { video?: { webm?: string; mp4?: string } }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [play, setPlay] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!video) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (reduced || saveData) return;
    const id = window.setTimeout(() => setPlay(true), 400);
    return () => window.clearTimeout(id);
  }, [video]);

  useEffect(() => {
    if (!play) return;
    const onVisibility = () => {
      const el = ref.current;
      if (!el) return;
      if (document.hidden) el.pause();
      else void el.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [play]);

  return (
    <>
      <div className="al-bg" aria-hidden="true">
        <picture>
          <source media="(max-width: 767px)" srcSet={POSTER_MOBILE} type="image/webp" />
          {/* Art-directed <picture>: the two files are already sized and compressed. */}
          <img src={POSTER} alt="" fetchPriority="high" decoding="async" />
        </picture>
        {play && video && (
          <video ref={ref} muted loop playsInline autoPlay preload="auto" tabIndex={-1} data-ready={ready} onCanPlay={() => setReady(true)}>
            {video.webm && <source src={video.webm} type="video/webm" />}
            {video.mp4 && <source src={video.mp4} type="video/mp4" />}
          </video>
        )}
      </div>
      <div className="al-shade" aria-hidden="true" />
    </>
  );
}
