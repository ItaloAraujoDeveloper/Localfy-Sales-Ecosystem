import { useState, useMemo, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Phone,
  MapPin,
  Search,
  Filter,
  MoreHorizontal,
  PhoneCall,
  History,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Clock,
  Building2,
  Star,
  Globe,
  MessageSquare,
  ArrowUpDown,
  X,
  FileText,
  AlertCircle,
  TrendingUp,
  Target
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Lead, LeadActivity, LeadStatus } from "@shared/schema";
import { STATUS_LABELS, CATEGORY_LABELS, ACTIVITY_TYPE_LABELS } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  distributed: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  negotiating: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  won: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const categoryColors: Record<string, string> = {
  gastronomy: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  health_beauty: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
  services: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  retail: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  generic: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

function extractNeighborhood(address: string | null): string {
  if (!address) return "";
  const parts = address.split(" - ");
  if (parts.length >= 2) {
    const neighborhoodPart = parts[1].split(",")[0];
    return neighborhoodPart.trim();
  }
  return "";
}

function extractCity(address: string | null, city: string | null): string {
  if (city && !city.match(/^\d{5}-\d{3}$/)) return city;
  if (!address) return "";
  const parts = address.split(" - ");
  if (parts.length >= 2) {
    const cityParts = parts[1].split(",");
    if (cityParts.length >= 2) {
      return cityParts[1].trim().split(" ")[0];
    }
  }
  return "";
}

function HistoryDialog({ 
  open, 
  onOpenChange, 
  leadId, 
  leadName 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  leadId: string; 
  leadName: string; 
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "call": return <PhoneCall className="h-4 w-4 text-green-500" />;
      case "status_change": return <ArrowUpDown className="h-4 w-4 text-blue-500" />;
      case "note": return <FileText className="h-4 w-4 text-amber-500" />;
      case "site_generated": return <Globe className="h-4 w-4 text-purple-500" />;
      case "assignment": return <Target className="h-4 w-4 text-pink-500" />;
      default: return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historico de Atividades
          </DialogTitle>
          <DialogDescription>
            Todas as interacoes com <span className="font-semibold">{leadName}</span>
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities && activities.length > 0 ? (
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-6">
                {activities.map((activity, index) => (
                  <div key={activity.id} className="relative flex gap-4 pl-2">
                    <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background border-2 border-border">
                      {getActivityIcon(activity.activityType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {ACTIVITY_TYPE_LABELS[activity.activityType as keyof typeof ACTIVITY_TYPE_LABELS] || activity.activityType}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(activity.createdAt)}
                        </span>
                      </div>
                      {activity.description && (
                        <p className="mt-2 text-sm text-foreground bg-muted/50 rounded-lg p-3">
                          {activity.description}
                        </p>
                      )}
                      {activity.previousStatus && activity.newStatus && (
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          <Badge className={statusColors[activity.previousStatus] + " border-0"}>
                            {STATUS_LABELS[activity.previousStatus as keyof typeof STATUS_LABELS]}
                          </Badge>
                          <span className="text-muted-foreground">→</span>
                          <Badge className={statusColors[activity.newStatus] + " border-0"}>
                            {STATUS_LABELS[activity.newStatus as keyof typeof STATUS_LABELS]}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhuma atividade registrada</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function CallModal({
  open,
  onOpenChange,
  lead,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
}) {
  const { toast } = useToast();
  const [callResult, setCallResult] = useState<string>("");
  const [callNote, setCallNote] = useState("");
  const [nextAction, setNextAction] = useState<LeadStatus | "keep" | "">("");

  const registerCallMutation = useMutation({
    mutationFn: async () => {
      const fullNote = callResult 
        ? `${callResult}${callNote ? ` - ${callNote}` : ""}`
        : callNote;
      return apiRequest("POST", `/api/leads/${lead.id}/call`, { note: fullNote });
    },
    onSuccess: () => {
      toast({ title: "Ligacao registrada com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id, "activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/leads"] });
      resetAndClose();
    },
    onError: () => {
      toast({ title: "Erro ao registrar ligacao", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, note }: { status: LeadStatus; note: string }) => {
      return apiRequest("PATCH", `/api/leads/${lead.id}/status`, { status, note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id, "activities"] });
    },
  });

  const resetAndClose = () => {
    setCallResult("");
    setCallNote("");
    setNextAction("");
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    await registerCallMutation.mutateAsync();
    
    // Only update status if a valid status is selected (not "keep" or empty)
    if (nextAction && nextAction !== "keep" && nextAction !== lead.status) {
      const fullNote = callResult 
        ? `Apos ligacao: ${callResult}${callNote ? ` - ${callNote}` : ""}`
        : `Apos ligacao${callNote ? `: ${callNote}` : ""}`;
      await updateStatusMutation.mutateAsync({ 
        status: nextAction as LeadStatus, 
        note: fullNote 
      });
    }
  };

  const callResults = [
    { value: "Atendeu - Interessado", label: "Atendeu - Interessado", iconType: "success" },
    { value: "Atendeu - Sem interesse", label: "Atendeu - Sem interesse", iconType: "error" },
    { value: "Atendeu - Retornar depois", label: "Atendeu - Retornar depois", iconType: "warning" },
    { value: "Nao atendeu", label: "Nao atendeu", iconType: "phone" },
    { value: "Numero invalido", label: "Numero invalido", iconType: "x" },
    { value: "Caixa postal", label: "Caixa postal", iconType: "voicemail" },
  ];

  const getResultIcon = (iconType: string) => {
    switch (iconType) {
      case "success": return <Check className="h-4 w-4 text-green-500" />;
      case "error": return <X className="h-4 w-4 text-red-500" />;
      case "warning": return <Clock className="h-4 w-4 text-amber-500" />;
      case "phone": return <Phone className="h-4 w-4 text-blue-500" />;
      case "x": return <AlertCircle className="h-4 w-4 text-gray-500" />;
      case "voicemail": return <MessageSquare className="h-4 w-4 text-purple-500" />;
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5 text-green-500" />
            Registrar Ligacao
          </DialogTitle>
          <DialogDescription>
            {lead.businessName}
            {lead.phone && (
              <span className="ml-2 font-mono text-foreground">{lead.phone}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Resultado da Ligacao</Label>
            <div className="grid grid-cols-2 gap-2">
              {callResults.map((result) => (
                <Button
                  key={result.value}
                  type="button"
                  size="sm"
                  variant={callResult === result.value ? "default" : "outline"}
                  className="justify-start gap-2"
                  onClick={() => setCallResult(result.value)}
                  data-testid={`button-call-result-${result.value.replace(/\s/g, "-").toLowerCase()}`}
                >
                  {getResultIcon(result.iconType)}
                  <span className="text-xs">{result.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="call-note">Observacoes (opcional)</Label>
            <Textarea
              id="call-note"
              placeholder="Adicione detalhes sobre a conversa..."
              value={callNote}
              onChange={(e) => setCallNote(e.target.value)}
              className="min-h-[80px]"
              data-testid="textarea-call-note"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Mover para outro status? (opcional)</Label>
            <Select value={nextAction} onValueChange={(v) => setNextAction(v as LeadStatus | "")}>
              <SelectTrigger data-testid="select-next-status">
                <SelectValue placeholder="Manter status atual" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keep">Manter status atual</SelectItem>
                <SelectItem value="negotiating">Em Negociacao</SelectItem>
                <SelectItem value="won">Venda Fechada</SelectItem>
                <SelectItem value="lost">Perdido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!callResult || registerCallMutation.isPending || updateStatusMutation.isPending}
            data-testid="button-confirm-call"
          >
            {registerCallMutation.isPending ? "Registrando..." : "Registrar Ligacao"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusChangeModal({
  open,
  onOpenChange,
  lead,
  newStatus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  newStatus: LeadStatus | null;
}) {
  const { toast } = useToast();
  const [note, setNote] = useState("");

  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/leads/${lead.id}/status`, { 
        status: newStatus, 
        note 
      });
    },
    onSuccess: () => {
      toast({ title: "Status atualizado!" });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id, "activities"] });
      setNote("");
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    },
  });

  if (!newStatus) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar Status</DialogTitle>
          <DialogDescription>
            Movendo <span className="font-semibold">{lead.businessName}</span> para{" "}
            <Badge className={statusColors[newStatus] + " border-0"}>
              {STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS]}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="status-note">Motivo da mudanca *</Label>
            <Textarea
              id="status-note"
              placeholder="Explique o motivo da mudanca de status..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[100px]"
              data-testid="textarea-status-note"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={() => updateStatusMutation.mutate()}
            disabled={!note.trim() || updateStatusMutation.isPending}
            data-testid="button-confirm-status"
          >
            {updateStatusMutation.isPending ? "Salvando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SellerLeadsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [neighborhoodFilter, setNeighborhoodFilter] = useState<string>("all");
  
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<LeadStatus | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Drag to scroll functionality
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Scroll speed multiplier
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  }, [isDragging, startX, scrollLeft]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: allActivities } = useQuery<LeadActivity[]>({
    queryKey: ["/api/seller/activities"],
    enabled: !!leads && leads.length > 0,
  });

  const activityMaps = useMemo(() => {
    const lastCallMap = new Map<string, LeadActivity | null>();
    const lastContactMap = new Map<string, Date | null>();
    
    if (!allActivities) return { lastCallMap, lastContactMap };
    
    const sortedActivities = [...allActivities].sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    
    for (const activity of sortedActivities) {
      if (activity.activityType === "call" && !lastCallMap.has(activity.leadId)) {
        lastCallMap.set(activity.leadId, activity);
      }
      if ((activity.activityType === "call" || activity.activityType === "note") && !lastContactMap.has(activity.leadId)) {
        lastContactMap.set(activity.leadId, activity.createdAt ? new Date(activity.createdAt) : null);
      }
    }
    
    return { lastCallMap, lastContactMap };
  }, [allActivities]);

  const getLastCall = (leadId: string): LeadActivity | null => {
    return activityMaps.lastCallMap.get(leadId) ?? null;
  };

  const getLastContact = (leadId: string): Date | null => {
    return activityMaps.lastContactMap.get(leadId) ?? null;
  };

  const cities = useMemo(() => {
    if (!leads) return [];
    const citySet = new Set<string>();
    leads.forEach(lead => {
      const city = extractCity(lead.address, lead.city);
      if (city) citySet.add(city);
    });
    return Array.from(citySet).sort();
  }, [leads]);

  const neighborhoods = useMemo(() => {
    if (!leads) return [];
    const neighborhoodSet = new Set<string>();
    leads
      .filter(lead => {
        if (cityFilter === "all") return true;
        return extractCity(lead.address, lead.city) === cityFilter;
      })
      .forEach(lead => {
        const neighborhood = extractNeighborhood(lead.address);
        if (neighborhood) neighborhoodSet.add(neighborhood);
      });
    return Array.from(neighborhoodSet).sort();
  }, [leads, cityFilter]);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    
    return leads.filter(lead => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchName = lead.businessName.toLowerCase().includes(search);
        const matchPhone = lead.phone?.toLowerCase().includes(search);
        const matchAddress = lead.address?.toLowerCase().includes(search);
        if (!matchName && !matchPhone && !matchAddress) return false;
      }
      
      if (statusFilter !== "all" && lead.status !== statusFilter) return false;
      if (categoryFilter !== "all" && lead.category !== categoryFilter) return false;
      
      if (cityFilter !== "all") {
        const city = extractCity(lead.address, lead.city);
        if (city !== cityFilter) return false;
      }
      
      if (neighborhoodFilter !== "all") {
        const neighborhood = extractNeighborhood(lead.address);
        if (neighborhood !== neighborhoodFilter) return false;
      }
      
      return true;
    });
  }, [leads, searchTerm, statusFilter, categoryFilter, cityFilter, neighborhoodFilter]);

  const stats = useMemo(() => {
    if (!leads) return { total: 0, negotiating: 0, won: 0, lost: 0 };
    return {
      total: leads.length,
      negotiating: leads.filter(l => l.status === "negotiating").length,
      won: leads.filter(l => l.status === "won").length,
      lost: leads.filter(l => l.status === "lost").length,
    };
  }, [leads]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const openWhatsApp = (phone: string, businessName: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const message = encodeURIComponent(`Ola! Estou entrando em contato sobre ${businessName}.`);
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, "_blank");
  };

  const handleOpenHistory = (lead: Lead) => {
    setSelectedLead(lead);
    setHistoryOpen(true);
  };

  const handleOpenCall = (lead: Lead) => {
    setSelectedLead(lead);
    setCallModalOpen(true);
  };

  const handleStatusChange = (lead: Lead, status: LeadStatus) => {
    setSelectedLead(lead);
    setPendingStatus(status);
    setStatusModalOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setCityFilter("all");
    setNeighborhoodFilter("all");
  };

  const hasActiveFilters = searchTerm || statusFilter !== "all" || categoryFilter !== "all" || 
                           cityFilter !== "all" || neighborhoodFilter !== "all";

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Meus Leads</h1>
          <p className="text-muted-foreground">
            Gerencie todos os seus leads em um so lugar
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Em Negociacao</p>
              <p className="text-xl font-bold">{stats.negotiating}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vendas</p>
              <p className="text-xl font-bold">{stats.won}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <X className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Perdidos</p>
              <p className="text-xl font-bold">{stats.lost}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                <X className="h-4 w-4 mr-1" />
                Limpar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-leads"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="distributed">Distribuidos</SelectItem>
                <SelectItem value="negotiating">Em Negociacao</SelectItem>
                <SelectItem value="won">Venda Fechada</SelectItem>
                <SelectItem value="lost">Perdidos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger data-testid="select-filter-category">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                <SelectItem value="gastronomy">Gastronomia</SelectItem>
                <SelectItem value="health_beauty">Saude e Beleza</SelectItem>
                <SelectItem value="services">Servicos</SelectItem>
                <SelectItem value="retail">Varejo</SelectItem>
                <SelectItem value="generic">Outros</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={cityFilter} 
              onValueChange={(v) => {
                setCityFilter(v);
                setNeighborhoodFilter("all");
              }}
            >
              <SelectTrigger data-testid="select-filter-city">
                <SelectValue placeholder="Cidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as cidades</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={neighborhoodFilter} onValueChange={setNeighborhoodFilter}>
              <SelectTrigger data-testid="select-filter-neighborhood">
                <SelectValue placeholder="Bairro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os bairros</SelectItem>
                {neighborhoods.map((neighborhood) => (
                  <SelectItem key={neighborhood} value={neighborhood}>{neighborhood}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {hasActiveFilters && (
            <div className="mt-3 text-sm text-muted-foreground">
              Mostrando {filteredLeads.length} de {leads?.length || 0} leads
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div 
            ref={scrollContainerRef}
            className={`overflow-x-auto select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Localizacao</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ultima Ligacao</TableHead>
                  <TableHead>Ultimo Contato</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Target className="h-8 w-8 mb-2" />
                        <p>Nenhum lead encontrado</p>
                        {hasActiveFilters && (
                          <Button variant="ghost" onClick={clearFilters} className="mt-1" data-testid="button-clear-filters-empty">
                            Limpar filtros
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => {
                    const city = extractCity(lead.address, lead.city);
                    const neighborhood = extractNeighborhood(lead.address);
                    
                    return (
                      <TableRow key={lead.id} className="hover-elevate">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {lead.businessName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{lead.businessName}</p>
                              {lead.rating && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                  {lead.rating} ({lead.reviewCount} avaliacoes)
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {lead.phone ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">{lead.phone}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => copyToClipboard(lead.phone!, lead.id)}
                                data-testid={`button-copy-phone-${lead.id}`}
                              >
                                {copied === lead.id ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Sem telefone</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            {neighborhood && (
                              <span className="text-sm font-medium">{neighborhood}</span>
                            )}
                            {city && (
                              <span className="text-xs text-muted-foreground">{city}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={categoryColors[lead.category || "generic"] + " border-0"}>
                            {CATEGORY_LABELS[lead.category as keyof typeof CATEGORY_LABELS] || "Outros"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[lead.status || "new"] + " border-0"}>
                            {STATUS_LABELS[lead.status as keyof typeof STATUS_LABELS]}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`cell-last-call-${lead.id}`}>
                          {(() => {
                            const lastCall = getLastCall(lead.id);
                            if (!lastCall) return <span className="text-xs text-muted-foreground">-</span>;
                            return (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-medium" data-testid={`text-last-call-result-${lead.id}`}>
                                  {lastCall.description || "Ligacao realizada"}
                                </span>
                                <span className="text-xs text-muted-foreground" data-testid={`text-last-call-date-${lead.id}`}>
                                  {lastCall.createdAt ? new Date(lastCall.createdAt).toLocaleDateString('pt-BR') : ''}
                                </span>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell data-testid={`cell-last-contact-${lead.id}`}>
                          {(() => {
                            const lastContact = getLastContact(lead.id);
                            if (!lastContact) return <span className="text-xs text-muted-foreground">-</span>;
                            return (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm" data-testid={`text-last-contact-date-${lead.id}`}>
                                  {lastContact.toLocaleDateString('pt-BR')}
                                </span>
                                <span className="text-xs text-muted-foreground" data-testid={`text-last-contact-time-${lead.id}`}>
                                  {lastContact.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            R$ {parseFloat(lead.monthlyValue || "0").toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {lead.phone && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-green-600"
                                  onClick={() => openWhatsApp(lead.phone!, lead.businessName)}
                                  title="WhatsApp"
                                  data-testid={`button-whatsapp-${lead.id}`}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenCall(lead)}
                                  title="Registrar Ligacao"
                                  data-testid={`button-call-${lead.id}`}
                                >
                                  <PhoneCall className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenHistory(lead)}
                              title="Historico"
                              data-testid={`button-history-${lead.id}`}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-actions-${lead.id}`}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {lead.siteGenerated && lead.previewSlug && (
                                  <DropdownMenuItem 
                                    onClick={() => window.open(`/ver/${lead.previewSlug}`, "_blank")}
                                    data-testid={`menu-preview-${lead.id}`}
                                  >
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Ver Preview
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleStatusChange(lead, "negotiating")}
                                  data-testid={`menu-negotiating-${lead.id}`}
                                >
                                  Mover para Em Negociacao
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleStatusChange(lead, "won")}
                                  data-testid={`menu-won-${lead.id}`}
                                >
                                  Mover para Venda Fechada
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleStatusChange(lead, "lost")}
                                  data-testid={`menu-lost-${lead.id}`}
                                >
                                  Marcar como Perdido
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedLead && (
        <>
          <HistoryDialog
            open={historyOpen}
            onOpenChange={setHistoryOpen}
            leadId={selectedLead.id}
            leadName={selectedLead.businessName}
          />
          <CallModal
            open={callModalOpen}
            onOpenChange={setCallModalOpen}
            lead={selectedLead}
          />
          <StatusChangeModal
            open={statusModalOpen}
            onOpenChange={setStatusModalOpen}
            lead={selectedLead}
            newStatus={pendingStatus}
          />
        </>
      )}
    </div>
  );
}
