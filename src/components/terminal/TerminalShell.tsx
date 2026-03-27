import { CRTOverlay } from "../effects/CRTOverlay";

interface TerminalShellProps {
  children: React.ReactNode;
}

export function TerminalShell({ children }: TerminalShellProps) {
  return (
    <div className="min-h-screen bg-terminal-bg animate-flicker relative">
      <CRTOverlay />
      <div className="relative z-10 max-w-6xl mx-auto p-3 sm:p-6 lg:p-8">
        <div className="border border-terminal-border rounded-lg bg-terminal-bg-light/50 p-4 sm:p-6 shadow-[0_0_15px_rgba(0,255,65,0.1)]">
          {children}
        </div>
      </div>
    </div>
  );
}
