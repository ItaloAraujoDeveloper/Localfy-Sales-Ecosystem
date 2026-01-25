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
  MessageCircle
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Lead, Seller, Commission } from "@shared/schema";
import { STATUS_LABELS, CATEGORY_LABELS } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

function LeadActionCard({ lead }: { lead: Lead }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return apiRequest("PATCH", `/api/leads/${lead.id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Status atualizado" });
    },
  });

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

        {/* Quick Actions */}
        <div className="flex gap-2 mt-4 pt-4 border-t">
          {lead.status === "distributed" && (
            <Button 
              size="sm" 
              variant="secondary"
              className="flex-1"
              onClick={() => updateStatusMutation.mutate("negotiating")}
            >
              Marcar Em Negociação
            </Button>
          )}
          {lead.status === "negotiating" && (
            <>
              <Button 
                size="sm"
                className="flex-1"
                onClick={() => updateStatusMutation.mutate("won")}
              >
                Venda Realizada
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => updateStatusMutation.mutate("lost")}
              >
                Perdido
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PartnerPage() {
  const { user } = useAuth();

  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: sellers } = useQuery<Seller[]>({
    queryKey: ["/api/sellers"],
  });

  const { data: commissions } = useQuery<Commission[]>({
    queryKey: ["/api/commissions"],
  });

  // For demo, show all leads with sellers assigned
  const myLeads = leads?.filter(l => l.sellerId && l.status !== "lost") || [];
  const wonLeads = myLeads.filter(l => l.status === "won");
  
  // Calculate earnings
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Leads Ativos</p>
                <p className="text-2xl font-bold">{myLeads.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vendas Fechadas</p>
                <p className="text-2xl font-bold">{wonLeads.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm opacity-80">Comissões do Mês</p>
                <p className="text-2xl font-bold">
                  R$ {monthlyEarnings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leads Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Seus Leads</h2>
        {myLeads.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Target className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum lead atribuído</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Aguarde o administrador atribuir leads à sua carteira ou 
                busque novos leads próximos a você.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {myLeads.map(lead => (
              <LeadActionCard key={lead.id} lead={lead} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
