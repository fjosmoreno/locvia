"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Building2, Loader2, RefreshCw, KeyRound, UserPlus } from "lucide-react";
import { AGENCY_STATUS } from "@/lib/constants";

// Formata CNPJ: 12.345.678/0001-90
function formatCNPJ(value: string): string {
  const v = value.replace(/\D/g, "").slice(0, 14);
  if (v.length <= 2) return v;
  if (v.length <= 5) return `${v.slice(0, 2)}.${v.slice(2)}`;
  if (v.length <= 8) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5)}`;
  if (v.length <= 12) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8)}`;
  return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}`;
}

// Formata telefone: (31) 98765-4321
function formatPhone(value: string): string {
  const v = value.replace(/\D/g, "").slice(0, 11);
  if (v.length <= 2) return v ? `(${v}` : "";
  if (v.length <= 6) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  if (v.length <= 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
  return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
}

function randomPassword() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)];
  for (let i = 0; i < 4; i++) s += b[Math.floor(Math.random() * b.length)];
  return s;
}

export interface AgencyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (agency: { id: string; name: string }) => void;
}

export function AgencyFormDialog({ open, onOpenChange, onCreated }: AgencyFormDialogProps) {
  const [submitting, setSubmitting] = React.useState(false);

  // ===== Login =====
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPwd, setShowPwd] = React.useState(false);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");

  // ===== Dados da imobiliária =====
  const [agencyName, setAgencyName] = React.useState("");
  const [cnpj, setCnpj] = React.useState("");
  const [creci, setCreci] = React.useState("");
  const [responsibleName, setResponsibleName] = React.useState("");
  const [whatsapp, setWhatsapp] = React.useState("");
  const [agencyEmail, setAgencyEmail] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [instagram, setInstagram] = React.useState("");

  // ===== Status =====
  const [status, setStatus] = React.useState<string>(AGENCY_STATUS.APPROVED);
  const [verified, setVerified] = React.useState(true);

  function reset() {
    setEmail(""); setPassword(""); setShowPwd(false); setName(""); setPhone("");
    setAgencyName(""); setCnpj(""); setCreci(""); setResponsibleName("");
    setWhatsapp(""); setAgencyEmail(""); setAddress(""); setDescription("");
    setWebsite(""); setInstagram("");
    setStatus(AGENCY_STATUS.APPROVED); setVerified(true);
  }

  function handleClose(o: boolean) {
    if (submitting) return;
    if (!o) reset();
    onOpenChange(o);
  }

  function generatePassword() {
    setPassword(randomPassword());
    setShowPwd(true);
  }

  // Auto-preencher responsável com o nome do login
  React.useEffect(() => {
    if (!responsibleName && name) setResponsibleName(name);
  }, [name, responsibleName]);

  // Auto-aprovar/verificar conforme status
  React.useEffect(() => {
    if (status === AGENCY_STATUS.APPROVED) setVerified(true);
    if (status === AGENCY_STATUS.BLOCKED || status === AGENCY_STATUS.PENDING) setVerified(false);
  }, [status]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    // validações
    if (!email.trim() || !password || !name.trim() || !agencyName.trim()) {
      toast.error("Preencha e-mail, senha, nome do responsável e nome da imobiliária.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter ao menos 6 caracteres.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error("E-mail inválido.");
      return;
    }
    const cnpjClean = cnpj.replace(/\D/g, "");
    if (cnpjClean && cnpjClean.length !== 14) {
      toast.error("CNPJ inválido. Use 14 dígitos.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/agencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim(),
          phone: phone || undefined,
          agencyName: agencyName.trim(),
          cnpj: cnpjClean || undefined,
          creci: creci || undefined,
          responsibleName: responsibleName || name.trim(),
          whatsapp: whatsapp || undefined,
          agencyEmail: agencyEmail || email.trim(),
          address: address || undefined,
          description: description || undefined,
          website: website || undefined,
          instagram: instagram || undefined,
          status,
          verified,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Falha ao cadastrar imobiliária.");
        return;
      }
      toast.success(`${data.agency.name} cadastrada com sucesso.`, {
        description: status === AGENCY_STATUS.APPROVED
          ? "A imobiliária já pode anunciar."
          : `Status: ${status}.`,
      });
      onCreated?.({ id: data.agency.id, name: data.agency.name });
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error("Erro de rede. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto scroll-area p-0">
        <DialogHeader className="px-5 py-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary grid place-items-center ring-1 ring-primary/25">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base tracking-tight">Cadastrar imobiliária</DialogTitle>
              <DialogDescription className="text-xs">
                Cria o login de acesso e o perfil da imobiliária. Status padrão: aprovada.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={submit} className="px-5 py-4 space-y-5">
          {/* === LOGIN DE ACESSO === */}
          <Section title="Login de acesso" icon={<KeyRound className="w-3.5 h-3.5" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="E-mail de login" required>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@imobiliaria.com.br"
                  required
                />
              </Field>
              <Field label="Senha inicial" required>
                <div className="flex gap-1.5">
                  <Input
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mín. 6 caracteres"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={generatePassword}
                    title="Gerar senha"
                    className="shrink-0"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="text-[11px] text-muted-foreground hover:text-foreground mt-1"
                >
                  {showPwd ? "Ocultar" : "Mostrar"} senha
                </button>
              </Field>
              <Field label="Nome do responsável" required>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome completo"
                  required
                />
              </Field>
              <Field label="Telefone">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(31) 99999-9999"
                />
              </Field>
            </div>
          </Section>

          {/* === DADOS DA IMOBILIÁRIA === */}
          <Section title="Dados da imobiliária" icon={<Building2 className="w-3.5 h-3.5" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Nome fantasia" required className="sm:col-span-2">
                <Input
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  placeholder="Ex.: Savassi Imóveis"
                  required
                />
              </Field>
              <Field label="CNPJ">
                <Input
                  value={cnpj}
                  onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                  placeholder="00.000.000/0000-00"
                />
              </Field>
              <Field label="CRECI">
                <Input
                  value={creci}
                  onChange={(e) => setCreci(e.target.value)}
                  placeholder="CRECI/JF-12345"
                />
              </Field>
              <Field label="Responsável (anúncio)">
                <Input
                  value={responsibleName}
                  onChange={(e) => setResponsibleName(e.target.value)}
                  placeholder="Nome que aparece nos anúncios"
                />
              </Field>
              <Field label="WhatsApp">
                <Input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                  placeholder="(31) 99999-9999"
                />
              </Field>
              <Field label="E-mail institucional" className="sm:col-span-2">
                <Input
                  type="email"
                  value={agencyEmail}
                  onChange={(e) => setAgencyEmail(e.target.value)}
                  placeholder="contato@imobiliaria.com.br"
                />
              </Field>
              <Field label="Endereço" className="sm:col-span-2">
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, número, bairro, cidade/UF"
                />
              </Field>
              <Field label="Website" className="sm:col-span-2">
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://imobiliaria.com.br"
                />
              </Field>
              <Field label="Instagram" className="sm:col-span-2">
                <Input
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@imobiliaria"
                />
              </Field>
              <Field label="Descrição" className="sm:col-span-2">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve descrição da imobiliária, especialidades, regiões atendidas…"
                  rows={3}
                />
              </Field>
            </div>
          </Section>

          {/* === STATUS === */}
          <Section title="Status de publicação">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Status inicial">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AGENCY_STATUS.APPROVED}>Aprovada (pode anunciar)</SelectItem>
                    <SelectItem value={AGENCY_STATUS.PENDING}>Pendente (aguardar aprovação)</SelectItem>
                    <SelectItem value={AGENCY_STATUS.BLOCKED}>Bloqueada</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Selo verificado">
                <Select
                  value={verified ? "1" : "0"}
                  onValueChange={(v) => setVerified(v === "1")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Verificada (selo azul)</SelectItem>
                    <SelectItem value="0">Sem selo</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <DialogFooter className="px-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              Cadastrar imobiliária
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs font-medium text-foreground/80">
        {label}
        {required && <span className="text-rose-400 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}
