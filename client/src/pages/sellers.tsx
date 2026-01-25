import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Plus,
  Users,
  Mail,
  Phone,
  Target,
  DollarSign,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Seller, Lead } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface SellerFormData {
  name: string;
  email: string;
  phone: string;
  commissionRate: string;
  password: string;
}

function AddSellerDialog({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<SellerFormData>({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      commissionRate: "10.00",
      password: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: SellerFormData) => {
      return apiRequest("POST", "/api/sellers", {
        name: data.name,
        email: data.email,
        phone: data.phone,
        commissionRate: data.commissionRate,
        password: data.password,
        isActive: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sellers"] });
      toast({ title: "Vendedor adicionado com sucesso" });
      setOpen(false);
      form.reset();
      onSuccess();
    },
    onError: () => {
      toast({ title: "Erro ao adicionar vendedor", variant: "destructive" });
    },
  });

  const onSubmit = (data: SellerFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-seller">
          <Plus className="mr-2 h-4 w-4" />
          Novo Vendedor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Vendedor</DialogTitle>
          <DialogDescription>
            Preencha os dados do novo vendedor parceiro.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              rules={{ required: "Nome é obrigatório" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo" {...field} data-testid="input-seller-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@exemplo.com" {...field} data-testid="input-seller-email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="(11) 99999-9999" {...field} data-testid="input-seller-phone" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              rules={{ required: "Senha e obrigatoria", minLength: { value: 6, message: "Senha deve ter no minimo 6 caracteres" } }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha de Acesso</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Minimo 6 caracteres" {...field} data-testid="input-seller-password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="commissionRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comissao (%)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="10.00" {...field} data-testid="input-seller-commission" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-seller">
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function SellerCard({ seller, leads }: { seller: Seller; leads: Lead[] }) {
  const { toast } = useToast();
  
  const sellerLeads = leads.filter(l => l.sellerId === seller.id);
  const wonLeads = sellerLeads.filter(l => l.status === "won");
  const totalMrr = wonLeads.reduce((sum, l) => sum + parseFloat(l.monthlyValue || "0"), 0);
  const commission = totalMrr * (parseFloat(seller.commissionRate || "10") / 100);

  const toggleActiveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/sellers/${seller.id}`, {
        isActive: !seller.isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sellers"] });
      toast({ title: seller.isActive ? "Vendedor desativado" : "Vendedor ativado" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/sellers/${seller.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sellers"] });
      toast({ title: "Vendedor removido" });
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className={`hover-elevate ${!seller.isActive ? "opacity-60" : ""}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(seller.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{seller.name}</h3>
              <div className="flex items-center gap-2">
                <Badge variant={seller.isActive ? "default" : "secondary"}>
                  {seller.isActive ? "Ativo" : "Inativo"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {parseFloat(seller.commissionRate || "10")}% comissao
                </span>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid={`button-seller-menu-${seller.id}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                disabled={toggleActiveMutation.isPending}
                onClick={() => toggleActiveMutation.mutate()}
              >
                {toggleActiveMutation.isPending ? "Processando..." : (seller.isActive ? "Desativar" : "Ativar")}
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deleteMutation.isPending ? "Removendo..." : "Remover"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2 mb-4">
          {seller.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{seller.email}</span>
            </div>
          )}
          {seller.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{seller.phone}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Target className="h-4 w-4" />
            </div>
            <p className="text-lg font-bold">{sellerLeads.length}</p>
            <p className="text-xs text-muted-foreground">Leads</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
            </div>
            <p className="text-lg font-bold">{wonLeads.length}</p>
            <p className="text-xs text-muted-foreground">Vendas</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
            </div>
            <p className="text-lg font-bold text-accent">
              R$ {commission.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground">Comissao</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SellersPage() {
  const { data: sellers, isLoading: sellersLoading } = useQuery<Seller[]>({
    queryKey: ["/api/sellers"],
  });

  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const isLoading = sellersLoading || leadsLoading;

  const activeSellers = sellers?.filter(s => s.isActive).length || 0;
  const totalLeadsAssigned = leads?.filter(l => l.sellerId).length || 0;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Vendedores</h1>
          <p className="text-muted-foreground">
            Gerencie sua equipe de vendedores parceiros
          </p>
        </div>
        <AddSellerDialog onSuccess={() => {}} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vendedores Ativos</p>
              <p className="text-2xl font-bold">{activeSellers}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Target className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Leads Atribuidos</p>
              <p className="text-2xl font-bold">{totalLeadsAssigned}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-chart-3/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-chart-3" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Vendedores</p>
              <p className="text-2xl font-bold">{sellers?.length || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sellers Grid */}
      {sellers?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum vendedor cadastrado</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Adicione vendedores parceiros para distribuir leads e acompanhar comissoes.
            </p>
            <AddSellerDialog onSuccess={() => {}} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sellers?.map(seller => (
            <SellerCard key={seller.id} seller={seller} leads={leads || []} />
          ))}
        </div>
      )}
    </div>
  );
}
