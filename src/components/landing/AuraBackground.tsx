/** The two fixed, blurred gradient blobs behind the whole landing page (arena-prototype.html .aura). */
export function AuraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <div
        className="absolute -right-[18vw] -top-[8vw] size-[60vw] max-h-[760px] max-w-[760px] rounded-full blur-[90px]"
        style={{
          background:
            "radial-gradient(circle, rgba(255,107,53,0.20), transparent 65%)",
        }}
      />
      <div
        className="absolute left-[-20vw] top-[60vh] size-[50vw] max-h-[640px] max-w-[640px] rounded-full blur-[90px]"
        style={{
          background:
            "radial-gradient(circle, rgba(255,138,91,0.10), transparent 65%)",
        }}
      />
    </div>
  );
}
