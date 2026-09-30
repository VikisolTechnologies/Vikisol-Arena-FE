import type { SVGProps } from "react";

/**
 * Solid glyphs for icon badges (architect review A5: the boards use solid white glyphs inside
 * saturated circles, not thin outlines). 24×24, filled with currentColor; cut-outs use evenodd.
 */
type P = SVGProps<SVGSVGElement>;
const S = ({ children, ...p }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" clipRule="evenodd" aria-hidden {...p}>
    {children}
  </svg>
);

export const RunnerSolid = (p: P) => (
  <S {...p}>
    <circle cx="15" cy="4.2" r="2.2" />
    <path d="M10.6 7.6l3.3-1.1c1-.3 2 .1 2.4 1l1.3 2.6 2.8 1.2-.8 1.9-3.4-1.4-.8-1.5-1.3 3.3 2.7 2.5V21h-2.2v-4.4l-3-2.6-1.5 3.3-4.6 1.5-.7-2.1 3.7-1.2 2.3-5.5-1.5.5-1.4 2.8-2-1 1.7-3.4c.3-.6.6-1 1-1.2z" />
  </S>
);

export const PeopleSolid = (p: P) => (
  <S {...p}>
    <circle cx="9" cy="7.8" r="3.6" />
    <path d="M1.8 19.6c0-3.6 3.2-6.2 7.2-6.2s7.2 2.6 7.2 6.2v.6H1.8z" />
    <circle cx="17.2" cy="8.6" r="2.9" />
    <path d="M16.9 13.2c3.1-.1 5.3 2 5.3 5v.9h-4.4c-.2-2.3-1.2-4.4-2.9-5.8.6-.1 1.3-.1 2-.1z" />
  </S>
);

export const PersonSolid = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="7.5" r="4.2" />
    <path d="M3.8 20.2c0-4.2 3.7-7.2 8.2-7.2s8.2 3 8.2 7.2v.8H3.8z" />
  </S>
);

export const ChatSolid = (p: P) => (
  <S {...p}>
    <path d="M12 3c-5.2 0-9.2 3.6-9.2 8 0 2.3 1.1 4.4 2.9 5.8L4.9 21l4.7-2.5c.8.2 1.6.3 2.4.3 5.2 0 9.2-3.6 9.2-7.9S17.2 3 12 3z" />
  </S>
);

export const StarSolid = (p: P) => (
  <S {...p}>
    <path d="M12 2.4l2.9 6 6.6.9-4.8 4.6 1.2 6.6L12 17.3l-5.9 3.2 1.2-6.6-4.8-4.6 6.6-.9z" />
  </S>
);

export const HeartSolid = (p: P) => (
  <S {...p}>
    <path d="M12 21s-7.6-4.5-9.4-9.3C1.3 8.3 3.3 4.4 7.1 4.4c2 0 3.6 1.1 4.9 2.9 1.3-1.8 2.9-2.9 4.9-2.9 3.8 0 5.8 3.9 4.5 7.3C19.6 16.5 12 21 12 21z" />
  </S>
);

export const BriefcaseSolid = (p: P) => (
  <S {...p}>
    <path d="M9 3.5h6c1.1 0 2 .9 2 2V7h3c1.1 0 2 .9 2 2v3.5H2V9c0-1.1.9-2 2-2h3V5.5c0-1.1.9-2 2-2zM9.2 7h5.6V5.7H9.2z" />
    <path d="M2 14h8.2v1.2c0 .6.4 1 1 1h1.6c.6 0 1-.4 1-1V14H22v4.5c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2z" />
  </S>
);

export const LeafSolid = (p: P) => (
  <S {...p}>
    <path d="M20.6 3.2C11 3.2 4.3 7.8 4.3 14.3c0 1.5.4 2.9 1 4.1l-2 2 1.3 1.3 2-2c1.2.8 2.7 1.3 4.4 1.3 7.2 0 10.2-7.6 9.6-17.8zM7.9 18.1l-.9-.9c2.6-3.5 5.6-6.2 9.2-8.1-2.8 2.5-5.6 5.6-8.3 9z" />
  </S>
);

export const CompassSolid = (p: P) => (
  <S {...p}>
    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.2 5.8l-2.3 6.1-6.1 2.3 2.3-6.1zM12 10.6a1.4 1.4 0 100 2.8 1.4 1.4 0 000-2.8z" />
  </S>
);

export const GiftSolid = (p: P) => (
  <S {...p}>
    <path d="M4 11.5h7V21H5.2c-.7 0-1.2-.5-1.2-1.2zM13 11.5h7v8.3c0 .7-.5 1.2-1.2 1.2H13z" />
    <path d="M3 7.5h8v3H3zM13 7.5h8v3h-8zM11.3 7C10.4 4.6 8.8 3 7.4 3 6.2 3 5.3 3.9 5.3 5s.9 2 2.4 2zM12.7 7c.9-2.4 2.5-4 3.9-4 1.2 0 2.1.9 2.1 2s-.9 2-2.4 2z" />
  </S>
);

export const SparkleSolid = (p: P) => (
  <S {...p}>
    <path d="M10 3l1.9 5.6L17.5 10.5l-5.6 1.9L10 18l-1.9-5.6L2.5 10.5l5.6-1.9zM18 13.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z" />
  </S>
);

export const BuildingSolid = (p: P) => (
  <S {...p}>
    <path d="M4 21V5c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2v4h2c1.1 0 2 .9 2 2v10h-6v-4h-4v4zM7 6.5h2.2v2.2H7zM10.8 6.5H13v2.2h-2.2zM7 10.5h2.2v2.2H7zM10.8 10.5H13v2.2h-2.2zM16.5 12.5h1.8v1.8h-1.8zM16.5 16h1.8v1.8h-1.8z" />
  </S>
);

export const PinSolid = (p: P) => (
  <S {...p}>
    <path d="M12 2.2c-4.1 0-7.3 3.2-7.3 7.2 0 5.3 7.3 12.4 7.3 12.4s7.3-7.1 7.3-12.4c0-4-3.2-7.2-7.3-7.2zm0 4.4a2.8 2.8 0 110 5.6 2.8 2.8 0 010-5.6z" />
  </S>
);

export const PlusSolid = (p: P) => (
  <S {...p}>
    <path d="M10.7 4h2.6v6.7H20v2.6h-6.7V20h-2.6v-6.7H4v-2.6h6.7z" />
  </S>
);

export const ShieldSolid = (p: P) => (
  <S {...p}>
    <path d="M12 2l8 3v6.2c0 5-3.4 9.3-8 10.8-4.6-1.5-8-5.8-8-10.8V5zm3.9 7l-1.4-1.4-3.6 3.6-1.5-1.5L8 11.1l2.9 2.9z" />
  </S>
);

export const LockSolid = (p: P) => (
  <S {...p}>
    <path d="M7 10V7.5a5 5 0 0110 0V10h1c1.1 0 2 .9 2 2v7.5c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V12c0-1.1.9-2 2-2zm2.3 0h5.4V7.5a2.7 2.7 0 00-5.4 0zM12 13.5a1.6 1.6 0 00-.8 3v1.8h1.6v-1.8a1.6 1.6 0 00-.8-3z" />
  </S>
);

export const BellSolid = (p: P) => (
  <S {...p}>
    <path d="M12 2.5c-3.6 0-6.3 2.8-6.3 6.3v3.6L3.8 16v1.3h16.4V16l-1.9-3.6V8.8c0-3.5-2.7-6.3-6.3-6.3zM9.3 18.6h5.4a2.7 2.7 0 01-5.4 0z" />
  </S>
);

export const EyeSolid = (p: P) => (
  <S {...p}>
    <path d="M12 5C6.8 5 3 9.3 1.8 12c1.2 2.7 5 7 10.2 7s9-4.3 10.2-7C21 9.3 17.2 5 12 5zm0 3.2a3.8 3.8 0 110 7.6 3.8 3.8 0 010-7.6zm0 2a1.8 1.8 0 100 3.6 1.8 1.8 0 000-3.6z" />
  </S>
);

export const UserCardSolid = (p: P) => (
  <S {...p}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm4.5 4a2.3 2.3 0 100 4.6 2.3 2.3 0 000-4.6zM4.8 16.5h7.4c0-2-1.7-3.3-3.7-3.3s-3.7 1.3-3.7 3.3zM14 9h5v1.6h-5zM14 12.4h4v1.6h-4z" />
  </S>
);

export const BlockSolid = (p: P) => (
  <S {...p}>
    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-5.2 4.4A7.3 7.3 0 0117.6 16.2L6.8 6.4zm-.4 1.4l10.8 9.8A7.3 7.3 0 016.4 7.8z" />
  </S>
);

export const HelpSolid = (p: P) => (
  <S {...p}>
    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-.1 4.6c2.1 0 3.6 1.2 3.6 3 0 1.4-.8 2.2-1.9 2.8-.7.4-.9.7-.9 1.3v.5h-2v-.7c0-1.2.5-1.9 1.5-2.5.8-.5 1.1-.8 1.1-1.4 0-.7-.6-1.2-1.4-1.2-.9 0-1.5.5-1.6 1.4H8.3c.1-1.9 1.5-3.2 3.6-3.2zm-1.1 9.2h2.2V18h-2.2z" />
  </S>
);

export const LogoutSolid = (p: P) => (
  <S {...p}>
    <path d="M5 3h8c1.1 0 2 .9 2 2v3h-2.2V5.2H5.2v13.6h7.6V16H15v3c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2zm12.5 5l4 4-4 4-1.5-1.5 1.4-1.4H9v-2.2h8.4L16 9.5z" />
  </S>
);

export const TrashSolid = (p: P) => (
  <S {...p}>
    <path d="M9 2.5h6l.8 1.5H20v2.2H4V4h4.2zM5.5 7.5h13l-1 12.3c-.1 1-.9 1.7-1.9 1.7H8.4c-1 0-1.8-.7-1.9-1.7zm3.8 2.5v8.5h1.8V10zm3.6 0v8.5h1.8V10z" />
  </S>
);

export const ShareSolid = (p: P) => (
  <S {...p}>
    <path d="M18 2a3 3 0 100 6 3 3 0 001.6-.46l-6.2 3.6a3 3 0 100 1.72l6.2 3.6A3 3 0 1021 13a3 3 0 00-1.6.46l-6.2-3.6a3 3 0 000-1.72l6.2-3.6A3 3 0 1018 2z" />
  </S>
);

export const ChartSolid = (p: P) => (
  <S {...p}>
    <path d="M4 3h2.4v15.6H21V21H4zM8.5 12h3v5h-3zM13 8h3v9h-3zM17.5 5h3v12h-3z" />
  </S>
);
