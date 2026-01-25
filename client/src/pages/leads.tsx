import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Lead, Seller } from "@shared/schema";
import { CATEGORY_LABELS, STATUS_LABELS, type BusinessCategory, type LeadStatus } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Search,
  Filter,
  Phone,
  MapPin,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  AlertCircle,
  ShieldAlert,
  Sparkles,
  Globe,
  Wand2,
} from "lucide-react";

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-500",
  distributed: "bg-yellow-500",
  negotiating: "bg-purple-500",
  won: "bg-green-500",
  lost: "bg-red-500",
};

export default function LeadsPage() {
  const { toast } = useToast();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sellerFilter, setSellerFilter] = useState<string>("all");
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [generatingSiteLead, setGeneratingSiteLead] = useState<Lead | null>(null);
  const [sitePrompt, setSitePrompt] = useState("");
  const [isSiteDialogOpen, setIsSiteDialogOpen] = useState(false);

  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: sellers } = useQuery<Seller[]>({
    queryKey: ["/api/sellers"],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<Lead> }) => {
      return apiRequest("PATCH", `/api/leads/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead atualizado com sucesso" });
      setIsEditDialogOpen(false);
      setEditingLead(null);
    },
    onError: () => {
      toast({ title: "Erro ao atualizar lead", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead removido com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao remover lead", variant: "destructive" });
    },
  });


  const generateSiteMutation = useMutation({
    mutationFn: async (data: { id: string; customPrompt?: string }) => {
      return apiRequest("POST", `/api/leads/${data.id}/generate-site`, { customPrompt: data.customPrompt });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Site gerado com sucesso!" });
      setIsSiteDialogOpen(false);
      setGeneratingSiteLead(null);
      setSitePrompt("");
    },
    onError: () => {
      toast({ title: "Erro ao gerar site", variant: "destructive" });
    },
  });


  const handleGenerateSite = (lead: Lead) => {
    setGeneratingSiteLead(lead);
    setSitePrompt("");
    setIsSiteDialogOpen(true);
  };

  const handleConfirmGenerateSite = () => {
    if (!generatingSiteLead) return;
    generateSiteMutation.mutate({
      id: generatingSiteLead.id,
      customPrompt: sitePrompt.trim() || undefined,
    });
  };

  const filteredLeads = leads?.filter(lead => {
    const matchesSearch = 
      lead.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.city?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchesSeller = sellerFilter === "all" || lead.sellerId === sellerFilter;
    
    return matchesSearch && matchesStatus && matchesSeller;
  }) || [];

  const isOverdue = (dueDate: string | Date | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingLead) return;
    
    updateMutation.mutate({
      id: editingLead.id,
      updates: {
        businessName: editingLead.businessName,
        phone: editingLead.phone,
        address: editingLead.address,
        city: editingLead.city,
        status: editingLead.status,
        sellerId: editingLead.sellerId,
        monthlyValue: editingLead.monthlyValue,
        notes: editingLead.notes,
        dueDate: editingLead.dueDate,
      },
    });
  };

  const handleQuickStatusChange = (leadId: string, newStatus: LeadStatus) => {
    updateMutation.mutate({
      id: leadId,
      updates: { status: newStatus },
    });
  };

  const handleQuickSellerChange = (leadId: string, sellerId: string) => {
    updateMutation.mutate({
      id: leadId,
      updates: { 
        sellerId: sellerId === "none" ? null : sellerId,
        status: sellerId !== "none" ? "distributed" : "new",
      },
    });
  };

  const handleQuickDueDateChange = (leadId: string, dueDate: string) => {
    updateMutation.mutate({
      id: leadId,
      updates: { dueDate: dueDate ? new Date(dueDate) : null },
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64 gap-4">
        <ShieldAlert className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Acesso restrito a administradores</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Controle de Leads</h1>
        <p className="text-muted-foreground">
          Gerencie todos os negocios em uma visao completa
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, telefone ou cidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-leads"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="new">Novos</SelectItem>
                <SelectItem value="distributed">Distribuidos</SelectItem>
                <SelectItem value="negotiating">Em Negociacao</SelectItem>
                <SelectItem value="won">Venda Fechada</SelectItem>
                <SelectItem value="lost">Perdidos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sellerFilter} onValueChange={setSellerFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-seller-filter">
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Vendedores</SelectItem>
                {sellers?.map(seller => (
                  <SelectItem key={seller.id} value={seller.id}>
                    {seller.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{filteredLeads.length} leads encontrados</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Negocio</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id} data-testid={`row-lead-${lead.id}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{lead.businessName}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {lead.city || "-"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {CATEGORY_LABELS[lead.category as BusinessCategory]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {lead.phone ? (
                        <span 
                          className="flex items-center gap-1 text-sm"
                          data-testid={`text-phone-${lead.id}`}
                        >
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={lead.status}
                        onValueChange={(value) => handleQuickStatusChange(lead.id, value as LeadStatus)}
                      >
                        <SelectTrigger className="w-[140px]" data-testid={`select-status-${lead.id}`}>
                          <Badge variant="secondary">
                            {STATUS_LABELS[lead.status as LeadStatus]}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">Novo</SelectItem>
                          <SelectItem value="distributed">Distribuido</SelectItem>
                          <SelectItem value="negotiating">Em Negociacao</SelectItem>
                          <SelectItem value="won">Venda Fechada</SelectItem>
                          <SelectItem value="lost">Perdido</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={lead.sellerId || "none"}
                        onValueChange={(value) => handleQuickSellerChange(lead.id, value)}
                      >
                        <SelectTrigger className="w-[130px]" data-testid={`select-seller-${lead.id}`}>
                          <SelectValue placeholder="Atribuir" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem vendedor</SelectItem>
                          {sellers?.filter(s => s.isActive).map(seller => (
                            <SelectItem key={seller.id} value={seller.id}>
                              {seller.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={lead.dueDate ? new Date(lead.dueDate).toISOString().split("T")[0] : ""}
                          onChange={(e) => handleQuickDueDateChange(lead.id, e.target.value)}
                          className={`w-[140px] ${isOverdue(lead.dueDate) ? "border-destructive text-destructive" : ""}`}
                          data-testid={`input-duedate-${lead.id}`}
                        />
                        {isOverdue(lead.dueDate) && (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        R$ {parseFloat(lead.monthlyValue || "99").toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleGenerateSite(lead)}
                            title={(lead as any).siteGenerated ? "Regenerar site" : "Gerar site com IA"}
                            data-testid={`button-generate-site-${lead.id}`}
                          >
                            {(lead as any).siteGenerated ? (
                              <Globe className="h-4 w-4 text-green-500" />
                            ) : (
                              <Wand2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        {lead.previewSlug && (
                          <Button
                            size="icon"
                            variant="ghost"
                            asChild
                            data-testid={`button-preview-${lead.id}`}
                          >
                            <a href={`/ver/${lead.previewSlug}`} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(lead)}
                          data-testid={`button-edit-${lead.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Tem certeza que deseja remover este lead?")) {
                              deleteMutation.mutate(lead.id);
                            }
                          }}
                          data-testid={`button-delete-${lead.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLeads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum lead encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Lead</DialogTitle>
          </DialogHeader>
          {editingLead && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Negocio</Label>
                  <Input
                    value={editingLead.businessName}
                    onChange={(e) => setEditingLead({ ...editingLead, businessName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={editingLead.phone || ""}
                    onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Endereco</Label>
                  <Input
                    value={editingLead.address || ""}
                    onChange={(e) => setEditingLead({ ...editingLead, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input
                    value={editingLead.city || ""}
                    onChange={(e) => setEditingLead({ ...editingLead, city: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editingLead.status}
                    onValueChange={(value) => setEditingLead({ ...editingLead, status: value as LeadStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Novo</SelectItem>
                      <SelectItem value="distributed">Distribuido</SelectItem>
                      <SelectItem value="negotiating">Em Negociacao</SelectItem>
                      <SelectItem value="won">Venda Fechada</SelectItem>
                      <SelectItem value="lost">Perdido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Vendedor</Label>
                  <Select
                    value={editingLead.sellerId || "none"}
                    onValueChange={(value) => setEditingLead({ ...editingLead, sellerId: value === "none" ? null : value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem vendedor</SelectItem>
                      {sellers?.filter(s => s.isActive).map(seller => (
                        <SelectItem key={seller.id} value={seller.id}>
                          {seller.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor Mensal</Label>
                  <Input
                    type="number"
                    value={editingLead.monthlyValue || "99"}
                    onChange={(e) => setEditingLead({ ...editingLead, monthlyValue: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Prazo para Contato</Label>
                <Input
                  type="date"
                  value={editingLead.dueDate ? new Date(editingLead.dueDate).toISOString().split("T")[0] : ""}
                  onChange={(e) => setEditingLead({ ...editingLead, dueDate: e.target.value ? new Date(e.target.value) : null })}
                />
              </div>
              <div className="space-y-2">
                <Label>Observacoes</Label>
                <Textarea
                  value={editingLead.notes || ""}
                  onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
              data-testid="button-cancel-edit"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={updateMutation.isPending}
              data-testid="button-save-edit"
            >
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Generate Site Dialog */}
      <Dialog open={isSiteDialogOpen} onOpenChange={(open) => {
        setIsSiteDialogOpen(open);
        if (!open) {
          setGeneratingSiteLead(null);
          setSitePrompt("");
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="dialog-title-generate-site">
              <Wand2 className="h-5 w-5" />
              Gerar Site com IA
            </DialogTitle>
          </DialogHeader>
          {generatingSiteLead && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted" data-testid="display-site-lead-info">
                <p className="font-medium" data-testid="text-site-business-name">{generatingSiteLead.businessName}</p>
                <p className="text-sm text-muted-foreground" data-testid="text-site-city">{generatingSiteLead.city}</p>
              </div>
              <div className="space-y-2">
                <Label>Instrucoes adicionais (opcional)</Label>
                <Textarea
                  placeholder="Ex: Foque em musculacao e treino funcional, horario de 6h as 22h, promocao para novos alunos..."
                  value={sitePrompt}
                  onChange={(e) => setSitePrompt(e.target.value)}
                  rows={4}
                  data-testid="textarea-site-prompt"
                />
                <p className="text-xs text-muted-foreground">
                  A IA vai detectar automaticamente o tipo de negocio pelo nome e gerar conteudo especifico.
                </p>
              </div>
              {(generatingSiteLead as any).siteGenerated && (
                <div className="p-3 rounded-lg bg-muted border" data-testid="warning-existing-site">
                  <p className="text-sm flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Este lead ja possui um site gerado. Continuar ira substituir o conteudo atual.
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsSiteDialogOpen(false)}
              data-testid="button-cancel-site"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmGenerateSite} 
              disabled={generateSiteMutation.isPending}
              data-testid="button-confirm-site"
            >
              {generateSiteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando site...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Gerar Site
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
