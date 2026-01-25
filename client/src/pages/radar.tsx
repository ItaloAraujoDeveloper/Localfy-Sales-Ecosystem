import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Radar as RadarIcon,
  MapPin,
  Phone,
  Star,
  Building2,
  CheckCircle2,
  XCircle,
  Plus,
  Loader2
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Lead, Seller } from "@shared/schema";
import { BUSINESS_CATEGORIES, CATEGORY_LABELS, type BusinessCategory } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface DiscoveredBusiness {
  id: string;
  name: string;
  category: BusinessCategory;
  address: string;
  city: string;
  phone: string;
  rating: number;
  reviewCount: number;
  hasWebsite: boolean;
  alreadyImported?: boolean;
}

export default function RadarPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [discoveredBusinesses, setDiscoveredBusinesses] = useState<DiscoveredBusiness[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sellerAssignments, setSellerAssignments] = useState<Record<string, string>>({});

  const { data: existingLeads } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: sellers } = useQuery<Seller[]>({
    queryKey: ["/api/sellers"],
  });

  const activeSellers = sellers?.filter(s => s.isActive) || [];

  // Search using real Google Places API
  const handleSearch = async () => {
    if (!searchTerm || !location) {
      toast({ title: "Preencha o termo e localizacao", variant: "destructive" });
      return;
    }

    setIsSearching(true);
    setDiscoveredBusinesses([]);
    setSelectedIds(new Set());

    try {
      const response = await fetch(`/api/places/search?query=${encodeURIComponent(searchTerm)}&location=${encodeURIComponent(location)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao buscar negocios");
      }
      
      const results: DiscoveredBusiness[] = await response.json();
      
      // Check which businesses are already imported
      const existingNames = new Set(existingLeads?.map(l => l.businessName.toLowerCase()) || []);
      const existingPhones = new Set(existingLeads?.map(l => l.phone?.replace(/\D/g, "")) || []);
      
      const resultsWithImportStatus = results.map(b => ({
        ...b,
        alreadyImported: existingNames.has(b.name.toLowerCase()) || 
                         (b.phone ? existingPhones.has(b.phone.replace(/\D/g, "")) : false)
      }));
      
      setDiscoveredBusinesses(resultsWithImportStatus);
      
      const withoutSite = resultsWithImportStatus.filter(b => !b.hasWebsite && !b.alreadyImported).length;
      const alreadyImported = resultsWithImportStatus.filter(b => b.alreadyImported).length;
      toast({ 
        title: `${results.length} negocios encontrados`,
        description: `${withoutSite} sem website, ${alreadyImported} ja importados`,
      });
    } catch (error) {
      console.error("Search error:", error);
      toast({ 
        title: "Erro na busca", 
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive" 
      });
    } finally {
      setIsSearching(false);
    }
  };

  const importMutation = useMutation({
    mutationFn: async (businesses: DiscoveredBusiness[]) => {
      const results = await Promise.all(
        businesses.map(b => 
          apiRequest("POST", "/api/leads", {
            businessName: b.name,
            category: b.category,
            address: b.address,
            city: b.city,
            phone: b.phone,
            rating: b.rating.toString(),
            reviewCount: b.reviewCount,
            status: sellerAssignments[b.id] ? "distributed" : "new",
            sellerId: sellerAssignments[b.id] || null,
          })
        )
      );
      return results;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ 
        title: `${variables.length} leads importados`,
        description: "Leads adicionados ao pipeline com sucesso",
      });
      // Remove imported from discovered
      setDiscoveredBusinesses(prev => 
        prev.filter(b => !selectedIds.has(b.id))
      );
      setSelectedIds(new Set());
      setSellerAssignments({});
    },
    onError: () => {
      toast({ title: "Erro ao importar leads", variant: "destructive" });
    },
  });

  const assignSeller = (businessId: string, sellerId: string) => {
    setSellerAssignments(prev => ({
      ...prev,
      [businessId]: sellerId === "none" ? "" : sellerId,
    }));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllWithoutWebsite = () => {
    const ids = discoveredBusinesses
      .filter(b => !b.hasWebsite && !b.alreadyImported)
      .map(b => b.id);
    setSelectedIds(new Set(ids));
  };

  const handleImport = () => {
    const toImport = discoveredBusinesses.filter(b => selectedIds.has(b.id));
    if (toImport.length === 0) {
      toast({ title: "Selecione ao menos um negocio", variant: "destructive" });
      return;
    }
    importMutation.mutate(toImport);
  };

  const businessesWithoutSite = discoveredBusinesses.filter(b => !b.hasWebsite && !b.alreadyImported);
  const alreadyImportedCount = discoveredBusinesses.filter(b => b.alreadyImported).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Lead Radar</h1>
        <p className="text-muted-foreground">
          Encontre empresas sem presença digital na sua região
        </p>
      </div>

      {/* Search Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RadarIcon className="h-5 w-5 text-primary" />
            Buscar Negocios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="term">Termo de Busca</Label>
              <Input
                id="term"
                placeholder="Ex: restaurante, clinica, oficina..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                data-testid="input-search-term"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Localização</Label>
              <Input
                id="location"
                placeholder="Ex: São Paulo, Zona Sul"
                value={location}
                onChange={e => setLocation(e.target.value)}
                data-testid="input-location"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleSearch} 
                disabled={isSearching}
                className="w-full"
                data-testid="button-search"
              >
                {isSearching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                {isSearching ? "Buscando..." : "Buscar"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {discoveredBusinesses.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Resultados da Busca</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {businessesWithoutSite.length} sem website disponiveis{alreadyImportedCount > 0 ? `, ${alreadyImportedCount} ja importados` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={selectAllWithoutWebsite}
                data-testid="button-select-all"
              >
                Selecionar Sem Site
              </Button>
              <Button 
                size="sm"
                onClick={handleImport}
                disabled={selectedIds.size === 0 || importMutation.isPending}
                data-testid="button-import"
              >
                {importMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Importar ({selectedIds.size})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {discoveredBusinesses.map(business => (
                <div
                  key={business.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                    selectedIds.has(business.id) 
                      ? "border-primary bg-primary/5" 
                      : "hover-elevate"
                  } ${business.hasWebsite || business.alreadyImported ? "opacity-60" : ""}`}
                >
                  <Checkbox
                    checked={selectedIds.has(business.id)}
                    onCheckedChange={() => toggleSelect(business.id)}
                    disabled={business.hasWebsite || business.alreadyImported}
                    data-testid={`checkbox-business-${business.id}`}
                  />
                  
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{business.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {CATEGORY_LABELS[business.category]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{business.address}, {business.city}</span>
                      </div>
                      {business.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{business.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{business.rating}</span>
                      <span className="text-muted-foreground">({business.reviewCount})</span>
                    </div>
                    
                    {!business.alreadyImported && !business.hasWebsite && activeSellers.length > 0 && (
                      <Select
                        value={sellerAssignments[business.id] || "none"}
                        onValueChange={(value) => assignSeller(business.id, value)}
                      >
                        <SelectTrigger className="w-[140px] h-8" data-testid={`select-seller-${business.id}`}>
                          <SelectValue placeholder="Vendedor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem vendedor</SelectItem>
                          {activeSellers.map(seller => (
                            <SelectItem key={seller.id} value={seller.id}>
                              {seller.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    {business.alreadyImported ? (
                      <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Ja Importado
                      </Badge>
                    ) : business.hasWebsite ? (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Com Site
                      </Badge>
                    ) : (
                      <Badge className="gap-1 bg-accent text-accent-foreground">
                        <XCircle className="h-3 w-3" />
                        Sem Site
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isSearching && discoveredBusinesses.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <RadarIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Inicie uma Busca</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Digite um termo de busca e localização para encontrar negocios sem 
              presença digital na região.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
