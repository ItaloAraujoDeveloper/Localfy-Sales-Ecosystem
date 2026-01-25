import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Wallet,
  Target,
  TrendingUp,
  Copy,
  ExternalLink,
  Phone,
  MapPin,
  Check,
  MessageCircle,
  Calendar,
  Clock,
  AlertCircle,
  PhoneCall,
  History,
  FileText
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Lead, Seller, Commission, LeadActivity, LeadStatus } from "@shared/schema";
import { STATUS_LABELS, CATEGORY_LABELS, ACTIVITY_TYPE_LABELS } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

function LeadActionCard({ lead, onOpenHistory }: { lead: Lead; onOpenHistory?: (leadId: string) => void }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<LeadStatus | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callNote, setCallNote] = useState("");

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, note }: { status: LeadStatus; note: string }) => {
      return apiRequest("PATCH", `/api/leads/${lead.id}/status`, { status, note });
    },
    onMutate: async ({ status }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/leads"] });
      const previousLeads = queryClient.getQueryData<Lead[]>(["/api/leads"]);
      queryClient.setQueryData<Lead[]>(["/api/leads"], (old) =>
        old?.map((l) => l.id === lead.id ? { ...l, status } : l)
      );
      return { previousLeads };
    },
    onSuccess: () => {
      toast({ title: "Status atualizado" });
      setStatusModalOpen(false);
      setStatusNote("");
      setPendingStatus(null);
    },
    onError: (_err, _vars, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(["/api/leads"], context.previousLeads);
      }
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id, "activities"] });
    },
  });

  const registerCallMutation = useMutation({
    mutationFn: async (note: string) => {
      return apiRequest("POST", `/api/leads/${lead.id}/call`, { note });
    },
    onSuccess: () => {
      toast({ title: "Ligacao registrada" });
      setCallModalOpen(false);
      setCallNote("");
    },
    onError: () => {
      toast({ title: "Erro ao registrar ligacao", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id, "activities"] });
    },
  });

  const handleStatusChange = (newStatus: LeadStatus) => {
    setPendingStatus(newStatus);
    setStatusModalOpen(true);
  };

  const confirmStatusChange = () => {
    if (!pendingStatus) return;
    if (!statusNote.trim()) {
      toast({ title: "Informe o motivo da alteracao", variant: "destructive" });
      return;
    }
    updateStatusMutation.mutate({ status: pendingStatus, note: statusNote });
  };

  const confirmCall = () => {
    registerCallMutation.mutate(callNote || "Ligacao realizada");
  };

  const previewUrl = `${window.location.origin}/ver/${lead.previewSlug || lead.id}`;
  
  const salesScript = `Olá! Vi que ${lead.businessName} ainda não tem um site próprio. 

Preparei uma demonstração gratuita exclusiva para vocês:
${previewUrl}

É só clicar e ver como ficaria o site de vocês! Posso te mostrar mais detalhes?`;

  const copyMagicLink = () => {
    navigator.clipboard.writeText(salesScript);
    setCopied(true);
    toast({ title: "Script copiado para a área de transferência" });
    setTimeout(() => setCopied(false), 2000);
  };

  const openWhatsApp = () => {
    if (!lead.phone) {
      toast({ title: "Telefone não disponível", variant: "destructive" });
      return;
    }
    const phone = lead.phone.replace(/\D/g, "");
    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(salesScript)}`;
    window.open(url, "_blank");
  };

  return (
    <Card className="hover-elevate">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-xl font-bold text-primary">
                {lead.businessName.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="font-semibold">{lead.businessName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {CATEGORY_LABELS[lead.category as keyof typeof CATEGORY_LABELS]}
                </Badge>
                <Badge 
                  variant={lead.status === "won" ? "default" : "outline"}
                  className="text-xs"
                >
                  {STATUS_LABELS[lead.status as keyof typeof STATUS_LABELS]}
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-primary">
              R$ {parseFloat(lead.monthlyValue || "0").toLocaleString("pt-BR")}
            </p>
            <p className="text-xs text-muted-foreground">/mês</p>
          </div>
        </div>

        {lead.address && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2">
            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{lead.address}</span>
          </div>
        )}

        {lead.phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Phone className="h-4 w-4" />
            <span>{lead.phone}</span>
          </div>
        )}

        {/* Magic Link Button */}
        <Button 
          className="w-full mb-2"
          onClick={copyMagicLink}
          data-testid={`button-magic-link-${lead.id}`}
        >
          {copied ? (
            <Check className="mr-2 h-4 w-4" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          {copied ? "Copiado!" : "Copiar Magic Link"}
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline"
            onClick={openWhatsApp}
            className="gap-2"
            data-testid={`button-whatsapp-${lead.id}`}
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </Button>
          <Button 
            variant="outline"
            asChild
          >
            <a href={`/ver/${lead.previewSlug || lead.id}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Ver Site
            </a>
          </Button>
        </div>

        {/* Call Registration Button */}
        <Button 
          variant="secondary"
          className="w-full mt-2"
          onClick={() => setCallModalOpen(true)}
          data-testid={`button-register-call-${lead.id}`}
        >
          <PhoneCall className="mr-2 h-4 w-4" />
          Registrar Ligacao
        </Button>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-4 pt-4 border-t">
          {lead.status === "distributed" && (
            <Button 
              size="sm" 
              variant="secondary"
              className="flex-1"
              onClick={() => handleStatusChange("negotiating")}
              data-testid={`button-status-negotiating-${lead.id}`}
            >
              Marcar Em Negociacao
            </Button>
          )}
          {lead.status === "negotiating" && (
            <>
              <Button 
                size="sm"
                className="flex-1"
                onClick={() => handleStatusChange("won")}
                data-testid={`button-status-won-${lead.id}`}
              >
                Venda Realizada
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleStatusChange("lost")}
                data-testid={`button-status-lost-${lead.id}`}
              >
                Perdido
              </Button>
            </>
          )}
          {onOpenHistory && (
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onOpenHistory(lead.id)}
              data-testid={`button-history-${lead.id}`}
            >
              <History className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>

      {/* Status Change Modal */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Status</DialogTitle>
            <DialogDescription>
              Informe o motivo da alteracao para {pendingStatus ? STATUS_LABELS[pendingStatus] : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="statusNote">Motivo / Observacao *</Label>
              <Textarea
                id="statusNote"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Descreva o que aconteceu..."
                className="min-h-[100px]"
                data-testid="input-status-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmStatusChange}
              disabled={updateStatusMutation.isPending || !statusNote.trim()}
              data-testid="button-confirm-status"
            >
              {updateStatusMutation.isPending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Call Registration Modal */}
      <Dialog open={callModalOpen} onOpenChange={setCallModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Ligacao</DialogTitle>
            <DialogDescription>
              Registre a ligacao para {lead.businessName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="callNote">Observacao (opcional)</Label>
              <Textarea
                id="callNote"
                value={callNote}
                onChange={(e) => setCallNote(e.target.value)}
                placeholder="Como foi a ligacao? O cliente demonstrou interesse?"
                className="min-h-[100px]"
                data-testid="input-call-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCallModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmCall}
              disabled={registerCallMutation.isPending}
              data-testid="button-confirm-call"
            >
              {registerCallMutation.isPending ? "Registrando..." : "Registrar Ligacao"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function HistoryDialog({ leadId, leadName, open, onOpenChange }: { 
  leadId: string; 
  leadName: string;
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { data: activities, isLoading } = useQuery<LeadActivity[]>({
    queryKey: ["/api/leads", leadId, "activities"],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${leadId}/activities`);
      if (!res.ok) throw new Error("Failed to fetch activities");
      return res.json();
    },
    enabled: open,
  });

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "call": return <PhoneCall className="h-4 w-4 text-blue-500" />;
      case "status_change": return <FileText className="h-4 w-4 text-purple-500" />;
      case "note": return <FileText className="h-4 w-4 text-gray-500" />;
      case "site_generated": return <ExternalLink className="h-4 w-4 text-green-500" />;
      case "assignment": return <Target className="h-4 w-4 text-orange-500" />;
      default: return <History className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historico - {leadName}</DialogTitle>
          <DialogDescription>
            Todas as atividades registradas para este lead
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : activities?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma atividade registrada ainda.
            </p>
          ) : (
            activities?.map((activity) => (
              <div key={activity.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <div className="mt-0.5">{getActivityIcon(activity.activityType)}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {ACTIVITY_TYPE_LABELS[activity.activityType as keyof typeof ACTIVITY_TYPE_LABELS]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(activity.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                  {activity.previousStatus && activity.newStatus && (
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {STATUS_LABELS[activity.previousStatus as keyof typeof STATUS_LABELS]}
                      </Badge>
                      <span className="text-xs">→</span>
                      <Badge variant="secondary" className="text-xs">
                        {STATUS_LABELS[activity.newStatus as keyof typeof STATUS_LABELS]}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PartnerPage() {
  const { user } = useAuth();
  const [historyLeadId, setHistoryLeadId] = useState<string | null>(null);
  const [historyLeadName, setHistoryLeadName] = useState("");

  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: sellers } = useQuery<Seller[]>({
    queryKey: ["/api/sellers"],
  });

  const { data: commissions } = useQuery<Commission[]>({
    queryKey: ["/api/commissions"],
  });

  const openHistory = (leadId: string) => {
    const lead = leads?.find(l => l.id === leadId);
    if (lead) {
      setHistoryLeadId(leadId);
      setHistoryLeadName(lead.businessName);
    }
  };

  // Get today's date for comparison (start of day)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Filter leads
  const myLeads = leads?.filter(l => l.sellerId && l.status !== "lost") || [];
  const wonLeads = myLeads.filter(l => l.status === "won");
  const activeLeads = myLeads.filter(l => l.status !== "won");
  
  // Leads to call today (dueDate is today)
  const todayCalls = activeLeads.filter(l => {
    if (!l.dueDate) return false;
    const dueDate = new Date(l.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === today.getTime();
  });

  // Overdue leads (dueDate is before today)
  const overdueLeads = activeLeads.filter(l => {
    if (!l.dueDate) return false;
    const dueDate = new Date(l.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() < today.getTime();
  });

  // Leads without due date that need scheduling
  const needsScheduling = activeLeads.filter(l => !l.dueDate);
  
  // Calculate monthly commission earnings
  const monthlyEarnings = wonLeads.reduce((sum, l) => {
    const value = parseFloat(l.monthlyValue || "0");
    return sum + (value * 0.1); // 10% commission
  }, 0);

  const paidCommissions = commissions?.filter(c => c.isPaid).reduce((sum, c) => 
    sum + parseFloat(c.amount), 0) || 0;

  if (leadsLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-32" />
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Minha Carteira</h1>
        <p className="text-muted-foreground">
          Gerencie seus leads e acompanhe suas comissões
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ligações Hoje</p>
                <p className="text-xl font-bold">{todayCalls.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Atrasados</p>
                <p className="text-xl font-bold text-orange-500">{overdueLeads.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vendas Fechadas</p>
                <p className="text-xl font-bold text-green-500">{wonLeads.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs opacity-80">Comissão Mensal</p>
                <p className="text-xl font-bold">
                  R$ {monthlyEarnings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Calls Section */}
      {(todayCalls.length > 0 || overdueLeads.length > 0) && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Ligações para Hoje
            {todayCalls.length > 0 && (
              <Badge variant="default" className="ml-2">{todayCalls.length}</Badge>
            )}
          </h2>
          
          {overdueLeads.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-orange-500 font-medium mb-2 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {overdueLeads.length} lead(s) atrasado(s) - ligue agora!
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {overdueLeads.map(lead => (
                  <LeadActionCard key={lead.id} lead={lead} onOpenHistory={openHistory} />
                ))}
              </div>
            </div>
          )}
          
          {todayCalls.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {todayCalls.map(lead => (
                <LeadActionCard key={lead.id} lead={lead} onOpenHistory={openHistory} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Won Sales Section */}
      {wonLeads.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Vendas Fechadas
            <Badge variant="secondary" className="ml-2 bg-green-500/10 text-green-600">
              {wonLeads.length}
            </Badge>
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {wonLeads.map(lead => (
              <LeadActionCard key={lead.id} lead={lead} onOpenHistory={openHistory} />
            ))}
          </div>
        </div>
      )}

      {/* All Active Leads */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="h-5 w-5" />
          Todos os Leads Ativos
          <Badge variant="secondary" className="ml-2">{activeLeads.length}</Badge>
        </h2>
        {activeLeads.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Target className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum lead atribuído</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Aguarde o administrador atribuir leads à sua carteira.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {activeLeads.map(lead => (
              <LeadActionCard key={lead.id} lead={lead} onOpenHistory={openHistory} />
            ))}
          </div>
        )}
      </div>

      {/* History Dialog */}
      {historyLeadId && (
        <HistoryDialog
          leadId={historyLeadId}
          leadName={historyLeadName}
          open={!!historyLeadId}
          onOpenChange={(open) => !open && setHistoryLeadId(null)}
        />
      )}
    </div>
  );
}
