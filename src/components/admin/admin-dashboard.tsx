"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import {
  ShieldCheck,
  Loader2,
  X,
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
        className="w-full sm:max-w-3xl p-0 flex flex-col gap-0"
      >
        {/* Header */}
        <SheetHeader className="px-4 py-4 border-b border-border flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground grid place-items-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base leading-tight">
                Painel administrativo
              </SheetTitle>
              <SheetDescription className="text-xs">
                {status === "loading"
                  ? "Carregando sessão…"
                  : isAdmin
                  ? `Conectado como ${session?.user?.name ?? "admin"}`
                  : "MapImóvel"}
              </SheetDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={closeDrawer}
            aria-label="Fechar painel"
          >
            <X className="w-4 h-4" />
          </Button>
        </SheetHeader>

        {/* Body */}
        {status === "loading" ? (
          <div className="flex-1 grid place-items-center text-muted-foreground text-sm">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Carregando painel…
            </div>
          </div>
        ) : !isAdmin ? (
          <AccessDenied onClose={closeDrawer} />
        ) : (
          <Tabs defaultValue="overview" className="flex-1 flex flex-col gap-0 overflow-hidden">
            {/* Tabs nav — sticky */}
            <div className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10 px-2 py-2">
              <ScrollArea className="w-full">
                <TabsList className="bg-muted/60 h-auto p-1 flex w-max sm:w-full sm:justify-start">
                  <TabsTrigger value="overview" className="gap-1.5">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Visão geral
                  </TabsTrigger>
                  <TabsTrigger value="agencies" className="gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    Imobiliárias
                  </TabsTrigger>
                  <TabsTrigger value="properties" className="gap-1.5">
                    <Home className="w-3.5 h-3.5" />
                    Imóveis
                  </TabsTrigger>
                  <TabsTrigger value="users" className="gap-1.5">
                    <UsersIcon className="w-3.5 h-3.5" />
                    Usuários
                  </TabsTrigger>
                  <TabsTrigger value="plans" className="gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Planos
                  </TabsTrigger>
                  <TabsTrigger value="reports" className="gap-1.5">
                    <Flag className="w-3.5 h-3.5" />
                    Denúncias
                  </TabsTrigger>
                </TabsList>
              </ScrollArea>
            </div>

            {/* Tabs content — scrollable */}
            <div className="flex-1 overflow-y-auto custom-scroll">
              <TabsContent value="overview" className="mt-0">
                <OverviewTab />
              </TabsContent>
              <TabsContent value="agencies" className="mt-0">
                <AgenciesTab />
              </TabsContent>
              <TabsContent value="properties" className="mt-0">
                <PropertiesTab />
              </TabsContent>
              <TabsContent value="users" className="mt-0">
                <UsersTab />
              </TabsContent>
              <TabsContent value="plans" className="mt-0">
                <PlansTab />
              </TabsContent>
              <TabsContent value="reports" className="mt-0">
                <ReportsTab />
              </TabsContent>
            </div>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

function AccessDenied({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex-1 grid place-items-center p-6">
      <div className="flex flex-col items-center text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 grid place-items-center mb-4">
          <ShieldOff className="w-7 h-7" />
        </div>
        <h2 className="text-base font-semibold text-foreground mb-1">
          Acesso restrito a administradores.
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
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
