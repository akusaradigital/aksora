export function AppSplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-app)]">
      <img src="/icon-light.png" alt="" width={64} height={64} className="animate-pulse" />
    </div>
  );
}
