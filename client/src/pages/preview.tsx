import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Lead } from "@shared/schema";
import { CATEGORY_LABELS, type BusinessCategory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Phone, 
  MapPin, 
  Star, 
  Clock,
  MessageCircle,
  ExternalLink,
  Utensils,
  Scissors,
  Wrench,
  ShoppingBag,
  Building2,
  Instagram,
  Facebook
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Import stock images
import gastronomyHero from "../assets/images/gastronomy-hero.jpg";
import gastronomyProduct1 from "../assets/images/gastronomy-product-1.jpg";
import gastronomyProduct2 from "../assets/images/gastronomy-product-2.jpg";
import gastronomyProduct3 from "../assets/images/gastronomy-product-3.jpg";
import beautyHero from "../assets/images/beauty-hero.jpg";
import beautyService1 from "../assets/images/beauty-service-1.jpg";
import beautyService2 from "../assets/images/beauty-service-2.jpg";
import beautyService3 from "../assets/images/beauty-service-3.jpg";
import servicesHero from "../assets/images/services-hero.jpg";
import servicesWork1 from "../assets/images/services-work-1.jpg";
import retailHero from "../assets/images/retail-hero.jpg";
import retailProduct1 from "../assets/images/retail-product-1.jpg";
import retailProduct2 from "../assets/images/retail-product-2.jpg";
import genericHero from "../assets/images/generic-hero.jpg";
import gymHero from "../assets/images/gym-hero.jpg";
import gymService1 from "../assets/images/gym-service-1.jpg";
import gymService2 from "../assets/images/gym-service-2.jpg";
import gymService3 from "../assets/images/gym-service-3.jpg";

// Gym/Academia specific images
const GYM_IMAGES = {
  hero: gymHero,
  products: [gymService1, gymService2, gymService3],
};

const CATEGORY_IMAGES: Record<BusinessCategory, { hero: string; products: string[] }> = {
  gastronomy: {
    hero: gastronomyHero,
    products: [gastronomyProduct1, gastronomyProduct2, gastronomyProduct3],
  },
  health_beauty: {
    hero: beautyHero,
    products: [beautyService1, beautyService2, beautyService3],
  },
  services: {
    hero: servicesHero,
    products: [servicesWork1, servicesHero, servicesWork1],
  },
  retail: {
    hero: retailHero,
    products: [retailProduct1, retailProduct2, retailProduct1],
  },
  generic: {
    hero: genericHero,
    products: [genericHero, genericHero, genericHero],
  },
};

const CATEGORY_PRODUCTS: Record<BusinessCategory, { name: string; desc: string }[]> = {
  gastronomy: [
    { name: "X-Tudo Especial", desc: "Hamburguer completo com tudo que voce imaginar" },
    { name: "Hamburguer Artesanal", desc: "Blend especial da casa com ingredientes premium" },
    { name: "Combo Familia", desc: "4 hamburgueres + batatas + refrigerantes" },
  ],
  health_beauty: [
    { name: "Corte Feminino", desc: "Corte moderno com lavagem e finalizacao" },
    { name: "Coloracao Completa", desc: "Coloracao profissional com produtos premium" },
    { name: "Tratamento Facial", desc: "Limpeza de pele e hidratacao profunda" },
  ],
  services: [
    { name: "Consultoria Inicial", desc: "Avaliacao completa do seu projeto" },
    { name: "Servico Completo", desc: "Execucao profissional com garantia" },
    { name: "Manutencao", desc: "Acompanhamento e suporte continuo" },
  ],
  retail: [
    { name: "Produtos em Destaque", desc: "Os mais vendidos da nossa loja" },
    { name: "Lancamentos", desc: "Novidades que acabaram de chegar" },
    { name: "Promocoes", desc: "Ofertas especiais por tempo limitado" },
  ],
  generic: [
    { name: "Servico Premium", desc: "Nossa especialidade com qualidade garantida" },
    { name: "Atendimento VIP", desc: "Experiencia exclusiva para nossos clientes" },
    { name: "Solucoes Completas", desc: "Tudo que voce precisa em um so lugar" },
  ],
};

const CATEGORY_COLORS: Record<BusinessCategory, { primary: string; accent: string; bg: string }> = {
  gastronomy: { primary: "#FF6B35", accent: "#FF8C5A", bg: "#1a1a1a" },
  health_beauty: { primary: "#E91E8C", accent: "#F06ABC", bg: "#1a1a1a" },
  services: { primary: "#3B82F6", accent: "#60A5FA", bg: "#1a1a1a" },
  retail: { primary: "#10B981", accent: "#34D399", bg: "#1a1a1a" },
  generic: { primary: "#8B5CF6", accent: "#A78BFA", bg: "#1a1a1a" },
};

const CATEGORY_ICONS: Record<BusinessCategory, React.ComponentType<any>> = {
  gastronomy: Utensils,
  health_beauty: Scissors,
  services: Wrench,
  retail: ShoppingBag,
  generic: Building2,
};

// WhatsApp floating button - only shows if phone exists
function WhatsAppButton({ phone }: { phone?: string | null }) {
  if (!phone) return null;
  
  const whatsappNumber = phone.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/55${whatsappNumber}`;
  
  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-green-500 flex items-center justify-center shadow-lg hover:bg-green-600 transition-colors"
      data-testid="button-whatsapp-float"
    >
      <MessageCircle className="h-7 w-7 text-white" />
    </a>
  );
}

function PreviewTemplate({ lead }: { lead: Lead }) {
  const category = (lead.category as BusinessCategory) || "generic";
  const businessType = (lead as any).businessType as string | null | undefined;
  const colors = CATEGORY_COLORS[category];
  const defaultProducts = CATEGORY_PRODUCTS[category];
  const Icon = CATEGORY_ICONS[category];

  // Check if this is a gym/academia - use gym-specific images
  const isGym = businessType === "academia" || 
    lead.businessName.toLowerCase().includes("academia") ||
    lead.businessName.toLowerCase().includes("fitness") ||
    lead.businessName.toLowerCase().includes("gym");
  
  const defaultImages = isGym ? GYM_IMAGES : CATEGORY_IMAGES[category];

  // Get generated content or fallback to defaults
  const hasGeneratedContent = (lead as any).siteGenerated === true;
  const siteServices = (lead as any).siteServices as string[] | null | undefined;
  const siteServiceDescriptions = (lead as any).siteServiceDescriptions as string[] | null | undefined;
  const siteHeadline = (lead as any).siteHeadline as string | null | undefined;
  const siteDescription = (lead as any).siteDescription as string | null | undefined;
  
  // Use generated services if available, fallback to category defaults
  const services = hasGeneratedContent && siteServices && siteServices.length > 0
    ? siteServices.map((name: string, i: number) => ({
        name,
        desc: siteServiceDescriptions?.[i] || "Servico de qualidade"
      }))
    : defaultProducts;

  // Use AI-generated images if available, fallback to stock images
  const heroImage = lead.heroImageUrl || defaultImages.hero;
  const productImages = lead.productImages && lead.productImages.length > 0 
    ? lead.productImages 
    : defaultImages.products;

  const whatsappNumber = lead.phone?.replace(/\D/g, "") || "";
  const whatsappUrl = `https://wa.me/55${whatsappNumber}`;

  // Extract city from address
  const city = lead.city || lead.address?.split(",").pop()?.trim() || "sua cidade";
  
  // Generated headline and description
  const headline = hasGeneratedContent && siteHeadline ? siteHeadline : null;
  const description = hasGeneratedContent && siteDescription ? siteDescription : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg, color: "#ffffff" }}>
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="h-10 w-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: colors.primary }}
            >
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white">{lead.businessName}</h1>
              <p className="text-xs text-white/60">{city}</p>
            </div>
          </div>
          {lead.phone && (
            <Button 
              asChild 
              size="sm"
              style={{ backgroundColor: colors.primary }}
              className="text-white border-0"
              data-testid="button-header-cta"
            >
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" />
                Peca Agora
              </a>
            </Button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 min-h-[80vh] flex items-center">
        <div className="container mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              {headline ? (
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                  <span style={{ color: colors.primary }}>{headline}</span>
                </h2>
              ) : (
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                  O Melhor{" "}
                  <span style={{ color: colors.primary }}>
                    {CATEGORY_LABELS[category]}
                  </span>
                  <br />de {city}
                </h2>
              )}
              <p className="text-lg text-white/70 max-w-lg">
                {description || (
                  <>
                    Qualidade incomparavel no coracao da cidade. 
                    {lead.phone && " Entre em contato pelo WhatsApp e faca seu pedido."}
                    {!lead.phone && " Venha nos visitar!"}
                  </>
                )}
              </p>
              {lead.phone && (
                <Button 
                  asChild 
                  size="lg"
                  style={{ backgroundColor: colors.primary }}
                  className="text-white border-0"
                  data-testid="button-hero-cta"
                >
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Fazer Pedido no WhatsApp
                  </a>
                </Button>
              )}
            </div>
            <div className="relative">
              <div 
                className="absolute -inset-4 rounded-3xl opacity-30 blur-3xl"
                style={{ backgroundColor: colors.primary }}
              />
              <img
                src={heroImage}
                alt={lead.businessName}
                className="relative rounded-2xl shadow-2xl w-full aspect-square object-cover ring-4"
                style={{ ringColor: colors.primary }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Info Cards */}
      <section className="py-12 bg-black/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Address */}
            {lead.address && (
              <Card className="bg-white/5 border-white/10 text-white">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div 
                      className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${colors.primary}20` }}
                    >
                      <MapPin className="h-5 w-5" style={{ color: colors.primary }} />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Endereco</h3>
                      <p className="text-sm text-white/70">{lead.address}</p>
                      <a 
                        href={`https://maps.google.com/?q=${encodeURIComponent(lead.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm mt-2 inline-flex items-center gap-1"
                        style={{ color: colors.primary }}
                      >
                        Ver no Maps <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Hours */}
            <Card className="bg-white/5 border-white/10 text-white">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div 
                    className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${colors.primary}20` }}
                  >
                    <Clock className="h-5 w-5" style={{ color: colors.primary }} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Horarios</h3>
                    <p className="text-sm text-white/70">Segunda-feira</p>
                    <p className="text-sm" style={{ color: colors.primary }}>Fechado</p>
                    <p className="text-sm text-white/70 mt-1">Terca a Domingo</p>
                    <p className="text-sm text-white">10:00 - 22:00</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            {lead.phone && (
              <Card className="bg-white/5 border-white/10 text-white">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div 
                      className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${colors.primary}20` }}
                    >
                      <Phone className="h-5 w-5" style={{ color: colors.primary }} />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Contato</h3>
                      <p className="text-sm text-white">{lead.phone}</p>
                      <a 
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm mt-2 inline-flex items-center gap-1"
                        style={{ color: colors.primary }}
                      >
                        Chamar no WhatsApp <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Products/Services Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {category === "gastronomy" ? "Nosso Cardapio" : 
               category === "health_beauty" ? "Nossos Servicos" :
               category === "retail" ? "Nossos Produtos" : "O que Oferecemos"}
            </h2>
            <p className="text-white/60 max-w-xl mx-auto">
              {category === "gastronomy" 
                ? "Lanches artesanais feitos com ingredientes frescos e de qualidade"
                : category === "health_beauty"
                ? "Profissionais qualificados para cuidar da sua beleza"
                : "Qualidade e excelencia em tudo que fazemos"}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {services.map((service: { name: string; desc: string }, i: number) => (
              <div 
                key={i} 
                className="group rounded-2xl overflow-hidden border-2 transition-all duration-300"
                style={{ borderColor: `${colors.primary}60` }}
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={productImages[i] || defaultImages.products[i]}
                    alt={service.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6 bg-white/5">
                  <h3 className="font-bold text-lg mb-2">{service.name}</h3>
                  <p className="text-sm text-white/60 mb-4">{service.desc}</p>
                  <Button 
                    asChild 
                    className="w-full text-white border-0"
                    style={{ backgroundColor: colors.primary }}
                  >
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Pedir no WhatsApp
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      {lead.rating && (
        <section className="py-16 bg-black/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Avaliacoes dos Clientes</h2>
              <div className="flex items-center justify-center gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star}
                      className={`h-6 w-6 ${
                        star <= Math.round(parseFloat(lead.rating || "0"))
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-white/30"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-2xl font-bold ml-2">
                  {parseFloat(lead.rating).toFixed(1)}
                </span>
                {lead.reviewCount && (
                  <span className="text-white/60">
                    ({lead.reviewCount} avaliacoes)
                  </span>
                )}
              </div>
            </div>

            {/* Fake reviews */}
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { name: "Maria S.", text: "Excelente atendimento! Recomendo muito.", rating: 5 },
                { name: "Joao P.", text: "Qualidade impecavel, voltarei com certeza.", rating: 5 },
                { name: "Ana C.", text: "Melhor da regiao, precos justos.", rating: 4 },
              ].map((review, i) => (
                <Card key={i} className="bg-white/5 border-white/10 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star}
                          className={`h-4 w-4 ${
                            star <= review.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-white/30"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-white/80 mb-3">"{review.text}"</p>
                    <p className="text-sm font-semibold">{review.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Map Section */}
      {lead.address && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Onde Estamos</h2>
              <p className="text-white/60">Venha nos visitar em {city}</p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="rounded-2xl overflow-hidden border border-white/10">
                <iframe
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(lead.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                  width="100%"
                  height="400"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Localizacao"
                />
              </div>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-white/5 rounded-2xl">
                <div>
                  <h3 className="font-bold text-lg">{lead.businessName}</h3>
                  <p className="text-sm text-white/60">{lead.address}</p>
                </div>
                <Button 
                  asChild
                  style={{ backgroundColor: colors.primary }}
                  className="text-white border-0"
                >
                  <a 
                    href={`https://maps.google.com/?q=${encodeURIComponent(lead.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    Abrir no Maps
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-12 bg-black border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="h-10 w-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold">{lead.businessName}</h3>
                  <p className="text-xs text-white/60">{city}</p>
                </div>
              </div>
              <p className="text-sm text-white/60">
                {category === "gastronomy" 
                  ? "O melhor sabor da cidade. Ambiente acolhedor e sabor inesquecivel desde sempre."
                  : category === "health_beauty"
                  ? "Cuidando da sua beleza com profissionalismo e dedicacao."
                  : "Qualidade e excelencia em cada servico que oferecemos."}
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold mb-4">Links Rapidos</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li><a href="#" className="hover:text-white transition-colors">Cardapio</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Localizacao</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Fazer Pedido</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold mb-4">Contato</h4>
              <ul className="space-y-2 text-sm text-white/60">
                {lead.phone && (
                  <li className="flex items-center gap-2">
                    <Phone className="h-4 w-4" style={{ color: colors.primary }} />
                    {lead.phone}
                  </li>
                )}
                {lead.address && (
                  <li className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5" style={{ color: colors.primary }} />
                    <span>{lead.address}</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Hours */}
            <div>
              <h4 className="font-semibold mb-4">Horario de Funcionamento</h4>
              <ul className="space-y-1 text-sm">
                <li className="text-white/60">Segunda-feira</li>
                <li style={{ color: colors.primary }}>Fechado</li>
                <li className="text-white/60 mt-2">Terca a Domingo</li>
                <li className="text-white">10:00 - 22:00</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-white/10">
            <p className="text-sm text-white/40">
              {new Date().getFullYear()} {lead.businessName}. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-white/40 hover:text-white transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors">
                <MessageCircle className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* WhatsApp Float Button */}
      <WhatsAppButton phone={lead.phone} />
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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
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
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Pagina nao encontrada</h1>
          <p className="text-gray-400">O preview solicitado nao existe ou foi removido.</p>
        </div>
      </div>
    );
  }

  return <PreviewTemplate lead={lead} />;
}
