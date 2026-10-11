"use client";

import { useRef, type ComponentProps, type PointerEvent } from "react";
import { cn } from "@/lib/utils";

/**
 * Cartão com um brilho suave que acompanha o cursor (classe `.holofote` em globals.css).
 * No toque e no teclado o brilho aparece centralizado ao focar — sem depender do mouse.
 */
export function CartaoHolofote({ className, onPointerMove, ...props }: ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);

  function aoMover(evento: PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (el && evento.pointerType === "mouse") {
      const caixa = el.getBoundingClientRect();
      el.style.setProperty("--x", `${evento.clientX - caixa.left}px`);
      el.style.setProperty("--y", `${evento.clientY - caixa.top}px`);
    }
    onPointerMove?.(evento);
  }

  return <div ref={ref} onPointerMove={aoMover} className={cn("holofote", className)} {...props} />;
}
