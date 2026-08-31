"use client";

import * as React from "react";
import { X } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Item de menu "Fechar" — para ser o ÚLTIMO item de todo DropdownMenu.
 *
 * Por que existe: Radix DropdownMenu fecha ao clicar fora ou pressionar Esc,
 * mas isso é INVISÍVEL no mobile. Muitos usuários não sabem que existe uma
 * forma de fechar o menu e ficam "presos". Adicionar um item explícito
 * "Fechar" no rodapé do menu resolve isso de forma AAA.
 *
 * Visual: tint destrutivo discreto, separador sutil acima, ícone + label.
 * Sem preventDefault — comportamento padrão do DropdownMenuItem já fecha o menu.
 */
export interface CloseMenuItemProps
  extends React.ComponentProps<typeof DropdownMenuItem> {
  label?: string;
}

export function CloseMenuItem({
  label = "Fechar menu",
  className,
  ...rest
}: CloseMenuItemProps) {
  return (
    <DropdownMenuItem
      data-slot="close-menu-item"
      aria-label={label}
      className={cn(
        // 44px touch target mínimo
        "min-h-[44px] py-3 px-3",
        // Visual destrutivo discreto — diferente dos itens normais
        "text-muted-foreground",
        "focus:bg-destructive/12 focus:text-destructive",
        "[&_svg]:text-muted-foreground focus:[&_svg]:text-destructive",
        "rounded-lg",
        "cursor-pointer",
        // Posição relativa pro separador
        "relative",
        className
      )}
      {...rest}
    >
      <X className="w-4 h-4 shrink-0" strokeWidth={2.4} aria-hidden />
      <span className="text-sm font-semibold tracking-tight">{label}</span>
    </DropdownMenuItem>
  );
}
