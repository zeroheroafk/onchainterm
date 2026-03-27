import { BlinkingCursor } from "./BlinkingCursor";

const ASCII_LOGO = `
 ██████╗ ███╗   ██╗ ██████╗██╗  ██╗ █████╗ ██╗███╗   ██╗
██╔═══██╗████╗  ██║██╔════╝██║  ██║██╔══██╗██║████╗  ██║
██║   ██║██╔██╗ ██║██║     ███████║███████║██║██╔██╗ ██║
██║   ██║██║╚██╗██║██║     ██╔══██║██╔══██║██║██║╚██╗██║
╚██████╔╝██║ ╚████║╚██████╗██║  ██║██║  ██║██║██║ ╚████║
 ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝
              ████████╗███████╗██████╗ ███╗   ███╗
              ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║
                 ██║   █████╗  ██████╔╝██╔████╔██║
                 ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║
                 ██║   ███████╗██║  ██║██║ ╚═╝ ██║
                 ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝`;

const ASCII_LOGO_SMALL = `
╔═══════════════════════════╗
║   O N C H A I N T E R M  ║
╚═══════════════════════════╝`;

export function TerminalHeader() {
  return (
    <header className="text-center mb-6">
      <pre className="hidden sm:block text-terminal-green glow-green text-[0.45rem] md:text-[0.55rem] lg:text-xs leading-tight font-terminal select-none">
        {ASCII_LOGO}
      </pre>
      <pre className="sm:hidden text-terminal-green glow-green text-xs leading-tight font-terminal select-none">
        {ASCII_LOGO_SMALL}
      </pre>
      <p className="text-terminal-green-dim text-sm mt-3 font-mono tracking-widest uppercase">
        Real-time Crypto Market Intelligence
        <BlinkingCursor />
      </p>
      <div className="mt-2 border-t border-terminal-border" />
    </header>
  );
}
