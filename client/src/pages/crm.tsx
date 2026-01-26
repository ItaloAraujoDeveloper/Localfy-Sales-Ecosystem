import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Phone, 
  MapPin, 
  Star,
  ExternalLink,
  User,
  GripVertical,
  MoreHorizontal
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Lead, Seller } from "@shared/schema";
import { STATUS_LABELS, CATEGORY_LABELS, LEAD_STATUSES, type LeadStatus } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-500",
  distributed: "bg-yellow-500",
  negotiating: "bg-purple-500",
  won: "bg-green-500",
  lost: "bg-gray-500",
};

function LeadCard({ lead, sellers }: { lead: Lead; sellers: Seller[] }) {
  const { toast } = useToast();
  const seller = sellers.find(s => s.id === lead.sellerId);

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: LeadStatus) => {
      return apiRequest("PATCH", `/api/leads/${lead.id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Status atualizado" });
    },
  });

  return (
    <Card className="kanban-card mb-3 cursor-pointer group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-primary">
                {lead.businessName.charAt(0)}
              </span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid={`button-lead-menu-${lead.id}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {lead.siteGenerated && lead.previewSlug && (
                <>
                  <DropdownMenuItem asChild>
                    <a href={`/ver/${lead.previewSlug}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Ver Preview
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {LEAD_STATUSES.filter(s => s !== lead.status).map(status => (
                <DropdownMenuItem 
                  key={status}
                  disabled={updateStatusMutation.isPending}
                  onClick={() => updateStatusMutation.mutate(status)}
                >
                  {updateStatusMutation.isPending ? "Movendo..." : `Mover para ${STATUS_LABELS[status]}`}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h3 className="font-semibold text-sm mb-1 line-clamp-1">{lead.businessName}</h3>
        
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="secondary" className="text-xs">
            {CATEGORY_LABELS[lead.category as keyof typeof CATEGORY_LABELS] || lead.category}
          </Badge>
          {lead.rating && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              {parseFloat(lead.rating).toFixed(1)}
            </div>
          )}
        </div>

        {lead.address && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground mb-2">
            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{lead.address}</span>
          </div>
        )}

        {lead.phone && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <Phone className="h-3 w-3" />
            <span>{lead.phone}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{seller?.name || "Nao atribuido"}</span>
          </div>
          <span className="text-sm font-semibold text-primary">
            R$ {parseFloat(lead.monthlyValue || "0").toLocaleString("pt-BR")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function KanbanColumn({ 
  status, 
  leads, 
  sellers 
}: { 
  status: LeadStatus; 
  leads: Lead[]; 
  sellers: Seller[];
}) {
  const columnLeads = leads.filter(l => l.status === status);
  const totalValue = columnLeads.reduce((sum, l) => sum + parseFloat(l.monthlyValue || "0"), 0);

  return (
    <div className="flex-shrink-0 w-80">
      <div className="bg-muted/50 rounded-lg p-3 kanban-column">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${STATUS_COLORS[status]}`} />
            <h3 className="font-semibold text-sm">{STATUS_LABELS[status]}</h3>
            <Badge variant="secondary" className="text-xs">
              {columnLeads.length}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            R$ {totalValue.toLocaleString("pt-BR")}
          </span>
        </div>

        <div className="space-y-0">
          {columnLeads.map(lead => (
            <LeadCard key={lead.id} lead={lead} sellers={sellers} />
          ))}
          {columnLeads.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum lead
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CRMPage() {
  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: sellers, isLoading: sellersLoading } = useQuery<Seller[]>({
    queryKey: ["/api/sellers"],
  });

  const isLoading = leadsLoading || sellersLoading;

  // Calculate MRR
  const mrr = leads?.filter(l => l.status === "won").reduce((sum, l) => sum + parseFloat(l.monthlyValue || "0"), 0) || 0;
  const potentialMrr = leads?.filter(l => l.status !== "lost").reduce((sum, l) => sum + parseFloat(l.monthlyValue || "0"), 0) || 0;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-80">
              <Skeleton className="h-[500px] rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">CRM Kanban</h1>
          <p className="text-muted-foreground">
            Gerencie seu pipeline de vendas
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">MRR Atual</p>
            <p className="text-lg font-bold text-accent">
              R$ {mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">MRR Potencial</p>
            <p className="text-lg font-bold">
              R$ {potentialMrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <ScrollArea className="flex-1 -mx-6 px-6">
        <div className="flex gap-4 pb-4">
          {LEAD_STATUSES.map(status => (
            <KanbanColumn
              key={status}
              status={status}
              leads={leads || []}
              sellers={sellers || []}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
