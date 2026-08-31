"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import {
  ShieldCheck,
  Loader2,
  LayoutDashboard,
  Building2,
  Home,
  Users as UsersIcon,
  Sparkles,
  Flag,
  ShieldOff,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CloseButton } from "@/components/ui/close-button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUI } from "@/lib/store";
import { OverviewTab } from "@/components/admin/overview-tab";
import { AgenciesTab } from "@/components/admin/agencies-tab";
import { PropertiesTab } from "@/components/admin/properties-tab";
import { UsersTab } from "@/components/admin/users-tab";
import { PlansTab } from "@/components/admin/plans-tab";
import { ReportsTab } from "@/components/admin/reports-tab";

export function AdminDashboard() {
  const { drawer, closeDrawer } = useUI();
  const open = drawer === "admin";
  const { data: session, status } = useSession();

  const isAdmin = !!session?.user && session.user.role === "ADMIN";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeDrawer()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl p-0 flex flex-col gap-0 border-l-border/60 bg-background"
      >
        {/* Header — gradient subtle accent */}
        <SheetHeader className="px-4 py-4 border-b border-border/60 flex-row items-center justify-between space-y-0 relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent"
          />
          <div className="flex items-center gap-3 min-w-0 relative">
            <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0 ring-1 ring-primary/25 shadow-sm shadow-primary/10">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base leading-tight tracking-tight">
                Painel administrativo
              </SheetTitle>
              <SheetDescription className="text-xs">
                {status === "loading"
                  ? "Carregando sessão…"
                  : isAdmin
                  ? `Conectado como ${session?.user?.name ?? "admin"}`
                  : "LOCVIA"}
              </SheetDescription>
            </div>
          </div>
          <CloseButton variant="labeled" onClose={closeDrawer} className="shrink-0" />
        </SheetHeader>

        {/* Body */}
        {status === "loading" ? (
          <div className="flex-1 grid place-items-center text-muted-foreground text-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-xs">Carregando painel…</span>
            </div>
          </div>
        ) : !isAdmin ? (
          <AccessDenied onClose={closeDrawer} />
        ) : (
          <Tabs
            defaultValue="overview"
            className="flex-1 flex flex-col gap-0 overflow-hidden"
          >
            {/* Tabs nav — sticky, horizontal scrollable on mobile, ciano underline */}
            <div className="border-b border-border/60 bg-background/95 backdrop-blur-md sticky top-0 z-10">
              <ScrollArea className="w-full">
                <TabsList className="bg-transparent h-auto p-0 gap-0 flex w-max sm:w-full sm:justify-start rounded-none">
                  <AdminTabTrigger value="overview" icon={<LayoutDashboard className="w-3.5 h-3.5" />}>
                    Visão geral
                  </AdminTabTrigger>
                  <AdminTabTrigger value="agencies" icon={<Building2 className="w-3.5 h-3.5" />}>
                    Imobiliárias
                  </AdminTabTrigger>
                  <AdminTabTrigger value="properties" icon={<Home className="w-3.5 h-3.5" />}>
                    Imóveis
                  </AdminTabTrigger>
                  <AdminTabTrigger value="users" icon={<UsersIcon className="w-3.5 h-3.5" />}>
                    Usuários
                  </AdminTabTrigger>
                  <AdminTabTrigger value="plans" icon={<Sparkles className="w-3.5 h-3.5" />}>
                    Planos
                  </AdminTabTrigger>
                  <AdminTabTrigger value="reports" icon={<Flag className="w-3.5 h-3.5" />}>
                    Denúncias
                  </AdminTabTrigger>
                </TabsList>
              </ScrollArea>
            </div>

            {/* Tabs content — scrollable */}
            <div className="flex-1 overflow-y-auto scroll-area">
              <TabsContent value="overview" className="mt-0 animate-fade-in">
                <OverviewTab />
              </TabsContent>
              <TabsContent value="agencies" className="mt-0 animate-fade-in">
                <AgenciesTab />
              </TabsContent>
              <TabsContent value="properties" className="mt-0 animate-fade-in">
                <PropertiesTab />
              </TabsContent>
              <TabsContent value="users" className="mt-0 animate-fade-in">
                <UsersTab />
              </TabsContent>
              <TabsContent value="plans" className="mt-0 animate-fade-in">
                <PlansTab />
              </TabsContent>
              <TabsContent value="reports" className="mt-0 animate-fade-in">
                <ReportsTab />
              </TabsContent>
            </div>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

function AdminTabTrigger({
  value,
  icon,
  children,
}: {
  value: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <TabsTrigger
      value={value}
      className="gap-1.5 h-11 px-4 text-xs font-medium text-muted-foreground rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none hover:text-foreground hover:bg-muted/40 transition-colors relative"
    >
      {icon}
      {children}
    </TabsTrigger>
  );
}

function AccessDenied({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex-1 grid place-items-center p-6">
      <div className="flex flex-col items-center text-center max-w-sm animate-fade-in">
        <div className="relative mb-5">
          <div
            aria-hidden
            className="absolute inset-0 bg-rose-500/20 blur-2xl rounded-full"
          />
          <div className="relative w-16 h-16 rounded-2xl bg-card border border-rose-500/30 grid place-items-center text-rose-400 shadow-sm">
            <ShieldOff className="w-7 h-7" />
          </div>
        </div>
        <h2 className="text-base font-semibold text-foreground mb-1.5 tracking-tight">
          Acesso restrito a administradores.
        </h2>
        <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
          Sua conta não tem permissão para acessar o painel administrativo.
          Faça login com uma conta de administrador para continuar.
        </p>
        <Button size="sm" variant="outline" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>
  );
}
