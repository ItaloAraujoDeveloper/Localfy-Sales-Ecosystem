import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Lead } from "@shared/schema";
import { CATEGORY_LABELS, type BusinessCategory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { 
  Phone, 
  MapPin, 
  Star, 
  Clock,
  Mail,
  MessageCircle,
  ArrowRight,
  Utensils,
  Scissors,
  Wrench,
  ShoppingBag,
  Building2,
  CheckCircle2
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORY_ICONS: Record<BusinessCategory, React.ComponentType<any>> = {
  gastronomy: Utensils,
  health_beauty: Scissors,
  services: Wrench,
  retail: ShoppingBag,
  generic: Building2,
};

const CATEGORY_HERO_STYLES: Record<BusinessCategory, { gradient: string; accent: string }> = {
  gastronomy: { 
    gradient: "from-orange-600 to-red-600", 
    accent: "bg-orange-500" 
  },
  health_beauty: { 
    gradient: "from-pink-600 to-purple-600", 
    accent: "bg-pink-500" 
  },
  services: { 
    gradient: "from-blue-600 to-indigo-600", 
    accent: "bg-blue-500" 
  },
  retail: { 
    gradient: "from-green-600 to-teal-600", 
    accent: "bg-green-500" 
  },
  generic: { 
    gradient: "from-gray-700 to-gray-900", 
    accent: "bg-gray-600" 
  },
};

const CATEGORY_FEATURES: Record<BusinessCategory, string[]> = {
  gastronomy: [
    "Cardapio Digital Completo",
    "Pedidos via WhatsApp",
    "Galeria de Fotos",
    "Horario de Funcionamento",
    "Localizacao no Mapa",
  ],
  health_beauty: [
    "Agendamento Online",
    "Lista de Servicos",
    "Galeria de Trabalhos",
    "Perfil Profissional",
    "Avaliacoes de Clientes",
  ],
  services: [
    "Orcamento Online",
    "Areas de Atuacao",
    "Portfolio de Projetos",
    "Formulario de Contato",
    "Depoimentos",
  ],
  retail: [
    "Vitrine de Produtos",
    "Catalogo Digital",
    "Link para WhatsApp",
    "Promocoes em Destaque",
    "Localizacao da Loja",
  ],
  generic: [
    "Apresentacao Profissional",
    "Informacoes de Contato",
    "Sobre a Empresa",
    "Galeria de Fotos",
    "Formulario de Contato",
  ],
};

function GastronomyTemplate({ lead }: { lead: Lead }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Hero */}
      <div className="relative h-[60vh] bg-gradient-to-br from-orange-600 to-red-600">
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative h-full flex flex-col items-center justify-center text-center px-6">
          <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-6">
            <Utensils className="h-10 w-10" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">{lead.businessName}</h1>
          <p className="text-xl opacity-90 mb-8">Sabores que encantam</p>
          <div className="flex gap-4">
            <Button size="lg" className="bg-white text-orange-600 border-white">
              <Phone className="mr-2 h-5 w-5" />
              Ligar Agora
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white">
              <MessageCircle className="mr-2 h-5 w-5" />
              WhatsApp
            </Button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-gray-800 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Nossos Diferenciais</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {["Delivery Rapido", "Ingredientes Frescos", "Ambiente Acolhedor", "Pratos Exclusivos"].map((feature, i) => (
              <div key={i} className="text-center">
                <div className="h-12 w-12 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="h-6 w-6 text-orange-400" />
                </div>
                <p className="text-sm">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-6">Fale Conosco</h2>
          {lead.address && (
            <div className="flex items-center justify-center gap-2 text-gray-300 mb-3">
              <MapPin className="h-5 w-5" />
              <span>{lead.address}</span>
            </div>
          )}
          {lead.phone && (
            <div className="flex items-center justify-center gap-2 text-gray-300 mb-6">
              <Phone className="h-5 w-5" />
              <span>{lead.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-8 px-6 text-center text-gray-500">
        <p>{lead.businessName} - Todos os direitos reservados</p>
        <p className="text-xs mt-2">Site criado por Localfy</p>
      </footer>
    </div>
  );
}

function HealthBeautyTemplate({ lead }: { lead: Lead }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="relative h-[50vh] bg-gradient-to-br from-pink-500 to-purple-600">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative h-full flex flex-col items-center justify-center text-center px-6 text-white">
          <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-4">
            <Scissors className="h-8 w-8" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3">{lead.businessName}</h1>
          <p className="text-lg opacity-90 mb-6">Beleza e bem-estar para voce</p>
          <Button size="lg" className="bg-white text-pink-600 border-white">
            Agendar Horario
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Services */}
      <div className="py-16 px-6 bg-pink-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">Nossos Servicos</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {["Cortes", "Coloracao", "Tratamentos", "Manicure", "Maquiagem", "Depilacao"].map((service, i) => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-sm text-center">
                <p className="font-semibold text-gray-800">{service}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Entre em Contato</h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            {lead.phone && (
              <Button size="lg" className="bg-pink-500">
                <Phone className="mr-2 h-5 w-5" />
                {lead.phone}
              </Button>
            )}
            <Button size="lg" variant="outline">
              <MessageCircle className="mr-2 h-5 w-5" />
              WhatsApp
            </Button>
          </div>
          {lead.address && (
            <div className="flex items-center justify-center gap-2 text-gray-500 mt-6">
              <MapPin className="h-5 w-5" />
              <span>{lead.address}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-100 py-8 px-6 text-center text-gray-500">
        <p>{lead.businessName}</p>
        <p className="text-xs mt-2">Powered by Localfy</p>
      </footer>
    </div>
  );
}

function GenericTemplate({ lead }: { lead: Lead }) {
  const category = (lead.category as BusinessCategory) || "generic";
  const styles = CATEGORY_HERO_STYLES[category];
  const Icon = CATEGORY_ICONS[category];
  const features = CATEGORY_FEATURES[category];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className={`relative h-[50vh] bg-gradient-to-br ${styles.gradient}`}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative h-full flex flex-col items-center justify-center text-center px-6 text-white">
          <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-4">
            <Icon className="h-8 w-8" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3">{lead.businessName}</h1>
          <p className="text-lg opacity-90 mb-2">
            {CATEGORY_LABELS[category]}
          </p>
          {lead.rating && (
            <div className="flex items-center gap-1 mb-6">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{parseFloat(lead.rating).toFixed(1)}</span>
              {lead.reviewCount && (
                <span className="opacity-75">({lead.reviewCount} avaliacoes)</span>
              )}
            </div>
          )}
          <div className="flex gap-4">
            <Button size="lg" className="bg-white text-gray-800 border-white">
              <Phone className="mr-2 h-5 w-5" />
              Contato
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white">
              <MessageCircle className="mr-2 h-5 w-5" />
              WhatsApp
            </Button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="py-16 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">O que oferecemos</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm">
                <CheckCircle2 className={`h-5 w-5 ${styles.accent.replace('bg-', 'text-')}`} />
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">Entre em Contato</h2>
          <div className="bg-gray-50 rounded-2xl p-8 space-y-4">
            {lead.address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                <div>
                  <p className="font-medium text-gray-800">Endereco</p>
                  <p className="text-gray-600">{lead.address}</p>
                </div>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-gray-400 mt-1" />
                <div>
                  <p className="font-medium text-gray-800">Telefone</p>
                  <p className="text-gray-600">{lead.phone}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <p className="font-medium text-gray-800">Horario</p>
                <p className="text-gray-600">Segunda a Sexta: 9h - 18h</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center">
            <Button size="lg" className={styles.accent}>
              <Phone className="mr-2 h-5 w-5" />
              Ligar Agora
            </Button>
            <Button size="lg" variant="outline">
              <MessageCircle className="mr-2 h-5 w-5" />
              Enviar Mensagem
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
            <Icon className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold mb-2">{lead.businessName}</h3>
          {lead.address && (
            <p className="text-gray-400 mb-4">{lead.address}</p>
          )}
          <p className="text-gray-500 text-sm">
            Site criado automaticamente por Localfy
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function PreviewPage() {
  const [, params] = useRoute("/ver/:slug");
  const slug = params?.slug;

  const { data: lead, isLoading, error } = useQuery<Lead>({
    queryKey: ["/api/leads/preview", slug],
    queryFn: async () => {
      const res = await fetch(`/api/leads/preview/${slug}`);
      if (!res.ok) throw new Error("Lead not found");
      return res.json();
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
          <Skeleton className="h-8 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Pagina nao encontrada</h1>
          <p className="text-gray-600">O preview solicitado nao existe ou foi removido.</p>
        </div>
      </div>
    );
  }

  // Render template based on category
  const category = (lead.category as BusinessCategory) || "generic";
  
  switch (category) {
    case "gastronomy":
      return <GastronomyTemplate lead={lead} />;
    case "health_beauty":
      return <HealthBeautyTemplate lead={lead} />;
    default:
      return <GenericTemplate lead={lead} />;
  }
}
