import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Users, 
  Target, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  ExternalLink
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Lead, Seller } from "@shared/schema";
import { STATUS_LABELS, CATEGORY_LABELS } from "@shared/schema";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: sellers, isLoading: sellersLoading } = useQuery<Seller[]>({
    queryKey: ["/api/sellers"],
  });

  const stats = {
    totalLeads: leads?.length || 0,
    newLeads: leads?.filter(l => l.status === "new").length || 0,
    wonDeals: leads?.filter(l => l.status === "won").length || 0,
    mrr: leads?.filter(l => l.status === "won").reduce((sum, l) => sum + parseFloat(l.monthlyValue || "0"), 0) || 0,
    activeSellers: sellers?.filter(s => s.isActive).length || 0,
    conversionRate: leads?.length ? 
      ((leads.filter(l => l.status === "won").length / leads.length) * 100).toFixed(1) : "0",
  };

  const recentLeads = leads?.slice(0, 5) || [];

  if (leadsLoading || sellersLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Visao geral do seu ecossistema de vendas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/radar">
              <Plus className="mr-2 h-4 w-4" />
              Buscar Leads
            </Link>
          </Button>
          <Button asChild data-testid="button-new-lead">
            <Link href="/crm">
              Ver CRM
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Leads
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeads}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Badge variant="secondary" className="text-xs">
                {stats.newLeads} novos
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vendas Fechadas
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.wonDeals}</div>
            <div className="flex items-center gap-1 text-xs mt-1">
              <ArrowUpRight className="h-3 w-3 text-accent" />
              <span className="text-accent">{stats.conversionRate}%</span>
              <span className="text-muted-foreground">taxa de conversao</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              MRR
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats.mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              Receita mensal recorrente
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vendedores Ativos
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSellers}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Badge variant="secondary" className="text-xs">
                {sellers?.length || 0} total
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Leads and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Leads */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Leads Recentes</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/crm">Ver todos</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum lead ainda</p>
                <p className="text-sm">Use o Radar para descobrir oportunidades</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-semibold text-primary">
                          {lead.businessName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{lead.businessName}</p>
                        <p className="text-sm text-muted-foreground">
                          {CATEGORY_LABELS[lead.category as keyof typeof CATEGORY_LABELS] || lead.category}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={lead.status === "won" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {STATUS_LABELS[lead.status as keyof typeof STATUS_LABELS] || lead.status}
                      </Badge>
                      <span className="text-sm font-medium">
                        R$ {parseFloat(lead.monthlyValue || "0").toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats / Pipeline Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(STATUS_LABELS).map(([status, label]) => {
              const count = leads?.filter(l => l.status === status).length || 0;
              const percentage = leads?.length ? ((count / leads.length) * 100) : 0;
              
              return (
                <div key={status} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
