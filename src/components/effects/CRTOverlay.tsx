export function CRTOverlay() {
  return (
    <>
      <div className="crt-scanlines fixed inset-0 z-50 pointer-events-none" />
      <div className="crt-vignette fixed inset-0 z-50 pointer-events-none" />
    </>
  );
}
