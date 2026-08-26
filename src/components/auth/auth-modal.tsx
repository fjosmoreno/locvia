"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useUI } from "@/lib/store";
import { ROLES } from "@/lib/constants";
import { toast } from "sonner";
import { Loader2, Home, Building2, User as UserIcon, UserCog } from "lucide-react";
import { BrandLogo } from "@/components/layout/brand-logo";

export function AuthModal() {
  const { drawer, closeDrawer } = useUI();
  const open = drawer === "auth";
  const { data: session } = useSession();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<string>(ROLES.USER);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "",
    // agency
    agencyName: "", cnpj: "", creci: "", responsibleName: "",
  });

  if (session) {
    // se já logou, fecha
    if (open) closeDrawer();
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await signIn("credentials", {
          email: form.email,
          password: form.password,
          redirect: false,
        });
        if (res?.error) {
          toast.error("E-mail ou senha incorretos.");
        } else {
          toast.success("Bem-vindo de volta!");
          closeDrawer();
        }
      } else {
        const body: any = {
          email: form.email, password: form.password, name: form.name,
          phone: form.phone, role,
        };
        if (role === ROLES.AGENCY) {
          body.agency = {
            name: form.agencyName || form.name,
            cnpj: form.cnpj, creci: form.creci,
            responsibleName: form.responsibleName || form.name,
          };
        }
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const d = await res.json();
        if (!res.ok) {
          toast.error(d.error || "Erro ao cadastrar.");
        } else {
          // login automático
          await signIn("credentials", {
            email: form.email, password: form.password, redirect: false,
          });
          toast.success("Conta criada! Bem-vindo ao MapImóvel.");
          closeDrawer();
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeDrawer()}>
      <DialogContent className="sm:max-w-md max-h-[92vh] overflow-y-auto scroll-area">
        <DialogHeader>
          <div className="flex justify-center mb-1">
            <BrandLogo />
          </div>
          <DialogTitle className="text-center text-lg">
            {mode === "login" ? "Entrar no MapImóvel" : "Criar conta"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {mode === "login"
              ? "Acesse para favoritar e gerenciar seus anúncios."
              : "Escolha seu perfil e comece a usar."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="register">Cadastrar</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={submit} className="space-y-3 mt-3">
              <Field label="E-mail">
                <Input
                  type="email" required value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="voce@email.com"
                />
              </Field>
              <Field label="Senha">
                <Input
                  type="password" required value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••"
                />
              </Field>
              <SubmitButton loading={loading} label="Entrar" />
              <p className="text-[11px] text-center text-muted-foreground pt-1">
                Conta demo: user@mapimovel.com / user123
              </p>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={submit} className="space-y-3 mt-3">
              <Field label="Nome completo">
                <Input
                  required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Seu nome"
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="E-mail">
                  <Input
                    type="email" required value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </Field>
                <Field label="Telefone">
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="(31) 9..."
                  />
                </Field>
              </div>
              <Field label="Senha">
                <Input
                  type="password" required value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                />
              </Field>

              <div>
                <Label className="text-xs text-muted-foreground">Tipo de conta</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <RoleButton active={role === ROLES.USER} onClick={() => setRole(ROLES.USER)}
                    icon={<UserIcon className="w-4 h-4" />} label="Usuário" desc="Buscar imóveis" />
                  <RoleButton active={role === ROLES.AGENCY} onClick={() => setRole(ROLES.AGENCY)}
                    icon={<Building2 className="w-4 h-4" />} label="Imobiliária" desc="Anunciar" />
                  <RoleButton active={role === ROLES.OWNER} onClick={() => setRole(ROLES.OWNER)}
                    icon={<Home className="w-4 h-4" />} label="Proprietário" desc="Anunciar 1 imóvel" />
                  <RoleButton active={role === ROLES.BROKER} onClick={() => setRole(ROLES.BROKER)}
                    icon={<UserCog className="w-4 h-4" />} label="Corretor" desc="Anunciar" />
                </div>
              </div>

              {role === ROLES.AGENCY && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Dados da imobiliária</p>
                    <Field label="Nome da imobiliária">
                      <Input value={form.agencyName} onChange={(e) => setForm({ ...form, agencyName: e.target.value })} />
                    </Field>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="CNPJ">
                        <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
                      </Field>
                      <Field label="CRECI">
                        <Input value={form.creci} onChange={(e) => setForm({ ...form, creci: e.target.value })} />
                      </Field>
                    </div>
                    <p className="text-[11px] text-amber-600 bg-amber-50 rounded-md p-2">
                      Sua imobiliária será analisada e aprovada pelo nosso time antes de publicar.
                    </p>
                  </div>
                </>
              )}

              <SubmitButton loading={loading} label="Criar conta" />
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function RoleButton({ active, onClick, icon, label, desc }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-0.5 p-2.5 rounded-lg border text-left transition-colors ${
        active ? "border-primary bg-primary/10" : "border-border hover:bg-accent/50"
      }`}
    >
      <div className={active ? "text-primary" : "text-muted-foreground"}>{icon}</div>
      <div className="text-xs font-semibold text-foreground">{label}</div>
      <div className="text-[10px] text-muted-foreground">{desc}</div>
    </button>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <Button type="submit" className="w-full" disabled={loading}>
      {loading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
      {label}
    </Button>
  );
}
