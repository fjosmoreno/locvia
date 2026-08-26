"use client";

import { useSession, signOut } from "next-auth/react";
import {
  SlidersHorizontal,
  Heart,
  LayoutDashboard,
  LogOut,
  User as UserIcon,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/layout/brand-logo";
import { SearchBar } from "@/components/search/search-bar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUI } from "@/lib/store";
import { ROLE_LABELS } from "@/lib/auth";

export function Topbar() {
  const { data: session, status } = useSession();
  const { openDrawer, filters } = useUI();

  const user = session?.user;
  const initial = user?.name?.[0]?.toUpperCase() ?? "?";
  const activeFilterCount =
    (filters.purpose ? 1 : 0) +
    filters.propertyTypes.length +
    (filters.minPrice != null || filters.maxPrice != null ? 1 : 0) +
    (filters.bedrooms != null ? 1 : 0) +
    (filters.bathrooms != null ? 1 : 0) +
    (filters.parkingSpaces != null ? 1 : 0) +
    (filters.minArea != null ? 1 : 0);

  return (
    <header className="absolute top-0 inset-x-0 z-[1100] pointer-events-none">
      <div className="px-3 sm:px-4 pt-3">
        <div className="pointer-events-auto flex items-center gap-2 sm:gap-3">
          {/* Logo (escondido em telas muito pequenas para dar espaço à busca) */}
          <div className="hidden sm:block shrink-0">
            <BrandLogo />
          </div>
          <div className="sm:hidden shrink-0">
            <BrandLogo compact />
          </div>

          {/* Busca */}
          <div className="flex-1 max-w-xl">
            <SearchBar />
          </div>

          {/* Filtros */}
          <Button
            variant="secondary"
            size="icon"
            onClick={() => openDrawer("filters")}
            className="relative h-11 w-11 rounded-full shadow-md bg-white hover:bg-accent/80 shrink-0"
            aria-label="Filtros"
          >
            <SlidersHorizontal className="w-4.5 h-4.5" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {/* Perfil */}
          {status === "loading" ? (
            <Button variant="secondary" size="icon" className="h-11 w-11 rounded-full shadow-md bg-white shrink-0">
              <Loader2 className="w-4 h-4 animate-spin" />
            </Button>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  className="h-11 rounded-full shadow-md bg-white hover:bg-accent/80 pl-1.5 pr-3 gap-2 shrink-0"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="font-medium text-sm truncate">{user.name}</span>
                  <span className="text-xs text-muted-foreground font-normal truncate">
                    {user.email}
                  </span>
                  {user.role && user.role !== "USER" && (
                    <Badge variant="secondary" className="w-fit mt-1 text-[10px]">
                      {ROLE_LABELS[user.role] || user.role}
                    </Badge>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openDrawer("favorites")}>
                  <Heart className="w-4 h-4 mr-2" /> Meus favoritos
                </DropdownMenuItem>
                {(user.role === "AGENCY" || user.role === "OWNER" || user.role === "BROKER") && (
                  <DropdownMenuItem onClick={() => openDrawer("agency")}>
                    <LayoutDashboard className="w-4 h-4 mr-2" /> Painel do anunciante
                  </DropdownMenuItem>
                )}
                {user.role === "ADMIN" && (
                  <DropdownMenuItem onClick={() => openDrawer("admin")}>
                    <LayoutDashboard className="w-4 h-4 mr-2" /> Painel administrativo
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => signOut({ redirect: false })}>
                  <LogOut className="w-4 h-4 mr-2" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={() => openDrawer("auth")}
              className="h-11 rounded-full shadow-md shrink-0 px-4 sm:px-5"
            >
              <UserIcon className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline text-sm font-semibold">Entrar</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
