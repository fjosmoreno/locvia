"use client";

import { useSession, signOut } from "next-auth/react";
import {
  Heart,
  LayoutDashboard,
  LogOut,
  User as UserIcon,
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
import { CloseMenuItem } from "@/components/ui/close-menu-item";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUI } from "@/lib/store";
import { ROLE_LABELS } from "@/lib/auth";

export function Topbar() {
  const { data: session, status } = useSession();
  const { openDrawer } = useUI();

  const user = session?.user;
  const initial = user?.name?.[0]?.toUpperCase() ?? "?";

  return (
    <>
      {/* Backdrop sutil para legibilidade sobre o mapa (mobile only) */}
      <div className="topbar-backdrop-mobile" aria-hidden />
      <header className="absolute top-0 inset-x-0 z-[1100] pointer-events-none">
        <div className="px-3 sm:px-4 pt-3">
          <div className="pointer-events-auto flex items-center gap-2 sm:gap-3">
            {/* Logo — squircle 36px no mobile, full no desktop */}
            <div className="hidden sm:block shrink-0">
              <BrandLogo />
            </div>
            <div className="sm:hidden shrink-0">
              <BrandLogo compact />
            </div>

            {/* Busca — glass dark full-width */}
            <div className="flex-1 max-w-xl min-w-0">
              <SearchBar />
            </div>

            {/* Perfil — avatar 44px touch target */}
            {status === "loading" ? (
              <Button
                variant="secondary"
                size="icon"
                className="profile-trigger"
                aria-label="Carregando perfil"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
              </Button>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="profile-trigger"
                    aria-label="Menu do perfil"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary/12 text-primary text-xs font-bold">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-1.5">
                  <DropdownMenuLabel className="px-2 py-2 flex flex-col gap-0.5">
                    <span className="font-semibold text-sm truncate">{user.name}</span>
                    <span className="text-xs text-muted-foreground font-normal truncate">{user.email}</span>
                    {user.role && user.role !== "USER" && (
                      <Badge variant="secondary" className="w-fit mt-1 text-[10px] font-medium">
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => openDrawer("favorites")} className="rounded-lg cursor-pointer">
                    <Heart className="w-4 h-4 mr-2" /> Meus favoritos
                  </DropdownMenuItem>
                  {(user.role === "AGENCY" || user.role === "OWNER" || user.role === "BROKER" || user.role === "ADMIN") && (
                    <DropdownMenuItem onClick={() => openDrawer("agency")} className="rounded-lg cursor-pointer">
                      <LayoutDashboard className="w-4 h-4 mr-2" /> Painel do anunciante
                    </DropdownMenuItem>
                  )}
                  {user.role === "ADMIN" && (
                    <DropdownMenuItem onClick={() => openDrawer("admin")} className="rounded-lg cursor-pointer">
                      <LayoutDashboard className="w-4 h-4 mr-2" /> Painel administrativo
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut({ redirect: false })}
                    className="rounded-lg cursor-pointer text-muted-foreground focus:text-destructive"
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Sair
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <CloseMenuItem />
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={() => openDrawer("auth")}
                className="h-11 w-11 sm:w-auto sm:px-5 rounded-full shadow-md shrink-0 p-0 sm:gap-2"
                aria-label="Entrar"
              >
                <UserIcon className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline text-sm font-semibold">Entrar</span>
              </Button>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
