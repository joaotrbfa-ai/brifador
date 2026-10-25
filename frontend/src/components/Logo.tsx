import React from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "./ui/dialog";
import { VisuallyHidden } from "./ui/visually-hidden";
import { About } from "./About";

interface LogoProps {
  isCollapsed: boolean;
}

const Logo = React.forwardRef<HTMLButtonElement, LogoProps>(
  ({ isCollapsed }, ref) => {
    return (
      <Dialog aria-describedby={undefined}>
        {isCollapsed ? (
          <DialogTrigger asChild>
            <button
              ref={ref}
              type="button"
              className="flex items-center justify-center mb-2 cursor-pointer bg-transparent border-none p-0 hover:opacity-80 transition-opacity"
              aria-label="Sobre o Brifador"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-display text-lg font-extrabold text-primary-foreground">
                B
              </span>
            </button>
          </DialogTrigger>
        ) : (
          <DialogTrigger asChild>
            <button
              ref={ref}
              type="button"
              className="w-full mb-2 flex items-center gap-2 rounded-lg px-1 py-1 cursor-pointer hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label="Sobre o Brifador"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-display text-base font-extrabold text-primary-foreground">
                B
              </span>
              <span className="font-display text-xl font-extrabold tracking-tight text-foreground">
                Brifador
              </span>
            </button>
          </DialogTrigger>
        )}
        <DialogContent>
          <VisuallyHidden>
            <DialogTitle>Sobre o Brifador</DialogTitle>
          </VisuallyHidden>
          <About />
        </DialogContent>
      </Dialog>
    );
  },
);

Logo.displayName = "Logo";

export default Logo;
