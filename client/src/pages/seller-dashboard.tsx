import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Target, TrendingUp, Phone, CheckCircle2, XCircle, Clock, Calendar, Award, Flame, BarChart3 } from "lucide-react";
import type { Lead, LeadActivity } from "@shared/schema";

export default function SellerDashboardPage() {
  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/seller/leads"],
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery<LeadActivity[]>({
    queryKey: ["/api/seller/activities"],
  });

  const isLoading = leadsLoading || activitiesLoading;

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalLeads = leads?.length || 0;
  const inNegotiation = leads?.filter(l => l.status === "negotiating").length || 0;
  const won = leads?.filter(l => l.status === "won").length || 0;
  const lost = leads?.filter(l => l.status === "lost").length || 0;
  const distributed = leads?.filter(l => l.status === "distributed").length || 0;
  
  const conversionRate = totalLeads > 0 ? ((won / totalLeads) * 100).toFixed(1) : "0";
  const totalValue = leads?.filter(l => l.status === "won").reduce((sum, l) => sum + parseFloat(l.monthlyValue || "0"), 0) || 0;
  
  const allCalls = activities?.filter(a => a.activityType === "call") || [];
  const totalCalls = allCalls.length;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const callsToday = allCalls.filter(a => {
    if (!a.createdAt) return false;
    const callDate = new Date(a.createdAt);
    callDate.setHours(0, 0, 0, 0);
    return callDate.getTime() === today.getTime();
  }).length;

  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
  const callsThisWeek = allCalls.filter(a => {
    if (!a.createdAt) return false;
    const callDate = new Date(a.createdAt);
    return callDate >= thisWeekStart;
  }).length;

  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const callsThisMonth = allCalls.filter(a => {
    if (!a.createdAt) return false;
    const callDate = new Date(a.createdAt);
    return callDate >= thisMonthStart;
  }).length;

  const statusChanges = activities?.filter(a => a.activityType === "status_change") || [];
  const recentActivities = [...(activities || [])].sort((a, b) => 
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  ).slice(0, 10);

  const avgCallsPerLead = totalLeads > 0 ? (totalCalls / totalLeads).toFixed(1) : "0";

  const dailyCallsLast7Days = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    day.setHours(0, 0, 0, 0);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const count = allCalls.filter(a => {
      if (!a.createdAt) return false;
      const callDate = new Date(a.createdAt);
      return callDate >= day && callDate < nextDay;
    }).length;
    
    dailyCallsLast7Days.push({
      day: day.toLocaleDateString('pt-BR', { weekday: 'short' }),
      count
    });
  }

  const maxCalls = Math.max(...dailyCallsLast7Days.map(d => d.count), 1);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meu Dashboard</h1>
        <p className="text-muted-foreground">
          Acompanhe seu desempenho e metricas
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Target className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalLeads}</p>
                <p className="text-xs text-muted-foreground">Total de Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <TrendingUp className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inNegotiation}</p>
                <p className="text-xs text-muted-foreground">Em Negociacao</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{won}</p>
                <p className="text-xs text-muted-foreground">Vendas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{lost}</p>
                <p className="text-xs text-muted-foreground">Perdidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Award className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{conversionRate}%</p>
                <p className="text-xs text-muted-foreground">Taxa de Conversao</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <BarChart3 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">R$ {totalValue.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">MRR Gerado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Clock className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{distributed}</p>
                <p className="text-xs text-muted-foreground">Aguardando Contato</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Ligacoes
            </CardTitle>
            <CardDescription>Acompanhe suas ligacoes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span className="text-xs text-muted-foreground">Hoje</span>
                </div>
                <p className="text-3xl font-bold">{callsToday}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Esta Semana</span>
                </div>
                <p className="text-3xl font-bold">{callsThisWeek}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                  <span className="text-xs text-muted-foreground">Este Mes</span>
                </div>
                <p className="text-3xl font-bold">{callsThisMonth}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">Media por Lead</span>
                </div>
                <p className="text-3xl font-bold">{avgCallsPerLead}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Ultimos 7 dias</p>
              <div className="flex items-end gap-2 h-24">
                {dailyCallsLast7Days.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className="w-full bg-primary/80 rounded-t"
                      style={{ height: `${(d.count / maxCalls) * 100}%`, minHeight: d.count > 0 ? '4px' : '2px' }}
                    />
                    <span className="text-xs text-muted-foreground">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividades Recentes</CardTitle>
            <CardDescription>Suas ultimas acoes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recentActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma atividade registrada
                </p>
              ) : (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover-elevate">
                    <div className={`p-1.5 rounded-full ${
                      activity.activityType === "call" ? "bg-green-500/10" :
                      activity.activityType === "status_change" ? "bg-blue-500/10" :
                      "bg-gray-500/10"
                    }`}>
                      {activity.activityType === "call" ? (
                        <Phone className="h-3 w-3 text-green-500" />
                      ) : activity.activityType === "status_change" ? (
                        <TrendingUp className="h-3 w-3 text-blue-500" />
                      ) : (
                        <Clock className="h-3 w-3 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">
                        {activity.activityType === "call" ? "Ligacao registrada" :
                         activity.activityType === "status_change" ? "Status alterado" :
                         activity.activityType === "note" ? "Nota adicionada" :
                         activity.activityType === "site_generated" ? "Site gerado" :
                         "Atividade"}
                      </p>
                      {activity.description && (
                        <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {activity.createdAt ? new Date(activity.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '-'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
