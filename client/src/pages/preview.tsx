import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Lead } from "@shared/schema";
import { businessCategories, type BusinessCategory, type BusinessSection } from "@shared/businessCategories";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Phone, 
  MapPin, 
  Star, 
  Clock,
  MessageCircle,
  ExternalLink,
  Check,
  Calendar,
  Users,
  DollarSign,
  HelpCircle,
  Building2,
  Instagram,
  Mail,
  ChevronRight,
  Sparkles,
  Heart,
  Zap,
  Shield,
  Award,
  Target,
  Lightbulb,
  ThumbsUp,
  Camera,
  Music,
  Church,
  Scissors,
  Dumbbell,
  Utensils,
  Beer,
  Car,
  Home,
  Scale,
  Flower2,
  Paintbrush,
  Pill,
  PawPrint,
  Shirt,
  Candy,
  Croissant,
  Wrench,
  Stethoscope,
  ShoppingBag
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Church,
  Candy,
  Shirt,
  Beer,
  Paintbrush,
  Heart,
  Music,
  UtensilsCrossed: Utensils,
  Beef: Utensils,
  Croissant,
  Dumbbell,
  Scissors,
  PawPrint,
  Stethoscope,
  Pill,
  Car,
  Wrench,
  Home,
  Scale,
  Flower2,
  Building2,
  ShoppingBag,
  Utensils,
};

const FEATURE_ICONS = [Sparkles, Heart, Zap, Shield, Award, Target, Lightbulb, ThumbsUp, Star, Check];

const FALLBACK_IMAGES = {
  gastronomy: { hero: gastronomyHero, products: [gastronomyProduct1, gastronomyProduct2, gastronomyProduct3] },
  health_beauty: { hero: beautyHero, products: [beautyService1, beautyService2, beautyService3] },
  services: { hero: servicesHero, products: [servicesWork1, servicesHero, servicesWork1] },
  retail: { hero: retailHero, products: [retailProduct1, retailProduct2, retailProduct1] },
  generic: { hero: genericHero, products: [genericHero, genericHero, genericHero] },
  gym: { hero: gymHero, products: [gymService1, gymService2, gymService3] },
};

interface ScheduleItem {
  day: string;
  hours: string;
  closed?: boolean;
}

interface Testimonial {
  name: string;
  text: string;
  rating: number;
  avatar?: string;
}

interface Feature {
  title: string;
  description: string;
  icon?: string;
}

interface MenuItem {
  name: string;
  description?: string;
  price: string;
  category?: string;
  image?: string;
}

interface Event {
  title: string;
  date: string;
  time?: string;
  description?: string;
  image?: string;
}

interface PricingPlan {
  name: string;
  price: string;
  period?: string;
  features: string[];
  highlighted?: boolean;
}

interface TeamMember {
  name: string;
  role: string;
  image?: string;
  bio?: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface ThemeColors {
  primary: string;
  secondary: string;
  bg: string;
}

interface SectionProps {
  lead: Lead;
  colors: ThemeColors;
  section: BusinessSection;
  category: BusinessCategory;
  whatsappUrl: string;
}

function parseJSON<T>(jsonString: string | null | undefined, fallback: T): T {
  if (!jsonString) return fallback;
  try {
    const parsed = JSON.parse(jsonString);
    // If fallback is an array, ensure parsed value is also an array
    if (Array.isArray(fallback) && !Array.isArray(parsed)) {
      return fallback;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

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

function HeroSection({ lead, colors, section, category, whatsappUrl }: SectionProps) {
  const headline = lead.siteHeadline || section.title;
  const description = lead.siteDescription || `Bem-vindo ao ${lead.businessName}. ${category.defaultCTAs[0] || "Entre em contato conosco!"}`;
  
  const categoryImages = FALLBACK_IMAGES[lead.category as keyof typeof FALLBACK_IMAGES] || FALLBACK_IMAGES.generic;
  const heroImage = lead.heroImageUrl || categoryImages.hero;
  const city = lead.city || lead.address?.split(",").pop()?.trim() || "sua cidade";

  return (
    <section className="pt-16 min-h-[80vh] flex items-center" data-testid="section-hero">
      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              <span style={{ color: colors.primary }}>{headline}</span>
            </h2>
            <p className="text-lg text-white/70 max-w-lg">{description}</p>
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
                  {category.defaultCTAs[0] || "Entre em Contato"}
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
  );
}

function ServicesSection({ lead, colors, section, category, whatsappUrl }: SectionProps) {
  const services = lead.siteServices && lead.siteServices.length > 0 
    ? lead.siteServices.map((name, i) => ({ name, desc: lead.siteServiceDescriptions?.[i] || "" }))
    : category.defaultServices.map(name => ({ name, desc: "" }));
  
  const categoryImages = FALLBACK_IMAGES[lead.category as keyof typeof FALLBACK_IMAGES] || FALLBACK_IMAGES.generic;
  const productImages = lead.productImages && lead.productImages.length > 0 ? lead.productImages : categoryImages.products;

  return (
    <section className="py-16" data-testid="section-services">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>
          <p className="text-white/60 max-w-xl mx-auto">Qualidade e excelencia em tudo que fazemos</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {services.slice(0, 6).map((service, i) => (
            <div 
              key={i} 
              className="group rounded-2xl overflow-hidden border-2 transition-all duration-300"
              style={{ borderColor: `${colors.primary}60` }}
              data-testid={`card-service-${i}`}
            >
              <div className="aspect-square overflow-hidden">
                <img
                  src={productImages[i % productImages.length] || categoryImages.products[0]}
                  alt={service.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-6 bg-white/5">
                <h3 className="font-bold text-lg mb-2">{service.name}</h3>
                {service.desc && <p className="text-sm text-white/60 mb-4">{service.desc}</p>}
                {lead.phone && (
                  <Button 
                    asChild 
                    className="w-full text-white border-0"
                    style={{ backgroundColor: colors.primary }}
                  >
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Saiba Mais
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductsSection({ lead, colors, section, category, whatsappUrl }: SectionProps) {
  return <ServicesSection lead={lead} colors={colors} section={section} category={category} whatsappUrl={whatsappUrl} />;
}

function ScheduleSection({ lead, colors, section }: SectionProps) {
  const schedule = parseJSON<ScheduleItem[]>(lead.siteSchedule, [
    { day: "Segunda-feira", hours: "Fechado", closed: true },
    { day: "Terca a Sexta", hours: "08:00 - 18:00" },
    { day: "Sabado", hours: "08:00 - 14:00" },
    { day: "Domingo", hours: "Fechado", closed: true },
  ]);

  return (
    <section className="py-16 bg-black/30" data-testid="section-schedule">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>
        </div>
        <div className="max-w-md mx-auto">
          <Card className="bg-white/5 border-white/10 text-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div 
                  className="h-12 w-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${colors.primary}20` }}
                >
                  <Clock className="h-6 w-6" style={{ color: colors.primary }} />
                </div>
                <h3 className="font-semibold text-lg">Horario de Funcionamento</h3>
              </div>
              <div className="space-y-3">
                {schedule.map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-white/10 last:border-0">
                    <span className="text-white/70">{item.day}</span>
                    <span style={{ color: item.closed ? colors.primary : "white" }}>
                      {item.hours}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection({ lead, colors, section }: SectionProps) {
  const testimonials = parseJSON<Testimonial[]>(lead.siteTestimonials, [
    { name: "Maria S.", text: "Excelente atendimento! Recomendo muito.", rating: 5 },
    { name: "Joao P.", text: "Qualidade impecavel, voltarei com certeza.", rating: 5 },
    { name: "Ana C.", text: "Melhor da regiao, precos justos.", rating: 4 },
  ]);

  return (
    <section className="py-16 bg-black/30" data-testid="section-testimonials">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>
          {lead.rating && (
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
              <span className="text-2xl font-bold ml-2">{parseFloat(lead.rating || "0").toFixed(1)}</span>
              {lead.reviewCount && <span className="text-white/60">({lead.reviewCount} avaliacoes)</span>}
            </div>
          )}
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {testimonials.map((review, i) => (
            <Card key={i} className="bg-white/5 border-white/10 text-white" data-testid={`card-testimonial-${i}`}>
              <CardContent className="p-6">
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star}
                      className={`h-4 w-4 ${
                        star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-white/30"
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
  );
}

function FeaturesSection({ lead, colors, section }: SectionProps) {
  const features = parseJSON<Feature[]>(lead.siteFeatures, [
    { title: "Qualidade Premium", description: "Produtos e servicos de alta qualidade" },
    { title: "Atendimento Personalizado", description: "Cada cliente e unico para nos" },
    { title: "Precos Justos", description: "O melhor custo-beneficio da regiao" },
    { title: "Experiencia", description: "Anos de experiencia no mercado" },
  ]);

  return (
    <section className="py-16" data-testid="section-features">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => {
            const IconComponent = FEATURE_ICONS[i % FEATURE_ICONS.length];
            return (
              <Card key={i} className="bg-white/5 border-white/10 text-white" data-testid={`card-feature-${i}`}>
                <CardContent className="p-6 text-center">
                  <div 
                    className="h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: `${colors.primary}20` }}
                  >
                    <IconComponent className="h-7 w-7" style={{ color: colors.primary }} />
                  </div>
                  <h3 className="font-bold mb-2">{feature.title}</h3>
                  <p className="text-sm text-white/60">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MenuSection({ lead, colors, section, whatsappUrl }: SectionProps) {
  const menuItems = parseJSON<MenuItem[]>(lead.siteMenu, [
    { name: "Prato Principal", price: "R$ 45,00", description: "Delicioso prato da casa", category: "Principais" },
    { name: "Entrada Especial", price: "R$ 25,00", description: "Para comecar bem", category: "Entradas" },
    { name: "Sobremesa", price: "R$ 18,00", description: "Para finalizar com chave de ouro", category: "Sobremesas" },
  ]);

  const categories = [...new Set(menuItems.map(item => item.category || "Cardapio"))];

  return (
    <section className="py-16" data-testid="section-menu">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>
        </div>
        {categories.map((cat, catIndex) => (
          <div key={catIndex} className="mb-12 last:mb-0">
            <h3 className="text-xl font-bold mb-6" style={{ color: colors.primary }}>{cat}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {menuItems.filter(item => (item.category || "Cardapio") === cat).map((item, i) => (
                <Card key={i} className="bg-white/5 border-white/10 text-white" data-testid={`card-menu-${catIndex}-${i}`}>
                  <CardContent className="p-4 flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h4 className="font-bold">{item.name}</h4>
                      {item.description && <p className="text-sm text-white/60">{item.description}</p>}
                    </div>
                    <span className="font-bold whitespace-nowrap" style={{ color: colors.primary }}>{item.price}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
        {lead.phone && (
          <div className="text-center mt-8">
            <Button 
              asChild 
              size="lg"
              style={{ backgroundColor: colors.primary }}
              className="text-white border-0"
            >
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-5 w-5" />
                Fazer Pedido
              </a>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function EventsSection({ lead, colors, section }: SectionProps) {
  const events = parseJSON<Event[]>(lead.siteEvents, [
    { title: "Evento Especial", date: "Em breve", description: "Aguarde novidades!" },
  ]);

  return (
    <section className="py-16 bg-black/30" data-testid="section-events">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {events.map((event, i) => (
            <Card key={i} className="bg-white/5 border-white/10 text-white overflow-hidden" data-testid={`card-event-${i}`}>
              {event.image && (
                <img src={event.image} alt={event.title} className="w-full h-40 object-cover" />
              )}
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4" style={{ color: colors.primary }} />
                  <span className="text-sm" style={{ color: colors.primary }}>{event.date}</span>
                  {event.time && <span className="text-sm text-white/60">as {event.time}</span>}
                </div>
                <h3 className="font-bold text-lg mb-2">{event.title}</h3>
                {event.description && <p className="text-sm text-white/60">{event.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection({ lead, colors, section, whatsappUrl }: SectionProps) {
  const plans = parseJSON<PricingPlan[]>(lead.sitePricing, [
    { name: "Basico", price: "R$ 99", period: "/mes", features: ["Acesso basico", "Suporte por email"], highlighted: false },
    { name: "Profissional", price: "R$ 199", period: "/mes", features: ["Acesso completo", "Suporte prioritario", "Beneficios extras"], highlighted: true },
    { name: "Premium", price: "R$ 299", period: "/mes", features: ["Tudo incluido", "Suporte VIP", "Beneficios exclusivos"], highlighted: false },
  ]);

  return (
    <section className="py-16" data-testid="section-pricing">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <Card 
              key={i} 
              className={`text-white overflow-hidden ${plan.highlighted ? 'ring-2' : 'bg-white/5 border-white/10'}`}
              style={plan.highlighted ? { backgroundColor: `${colors.primary}10`, ringColor: colors.primary, borderColor: colors.primary } : {}}
              data-testid={`card-pricing-${i}`}
            >
              <CardContent className="p-6">
                {plan.highlighted && (
                  <span 
                    className="text-xs font-bold px-3 py-1 rounded-full mb-4 inline-block"
                    style={{ backgroundColor: colors.primary }}
                  >
                    Mais Popular
                  </span>
                )}
                <h3 className="font-bold text-xl mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold" style={{ color: colors.primary }}>{plan.price}</span>
                  {plan.period && <span className="text-white/60">{plan.period}</span>}
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, fi) => (
                    <li key={fi} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4" style={{ color: colors.primary }} />
                      <span className="text-white/80">{feature}</span>
                    </li>
                  ))}
                </ul>
                {lead.phone && (
                  <Button 
                    asChild 
                    className="w-full text-white border-0"
                    style={{ backgroundColor: plan.highlighted ? colors.primary : `${colors.primary}80` }}
                  >
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                      Escolher Plano
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function TeamSection({ lead, colors, section }: SectionProps) {
  const team = parseJSON<TeamMember[]>(lead.siteTeam, [
    { name: "Profissional 1", role: "Especialista" },
    { name: "Profissional 2", role: "Atendimento" },
  ]);

  return (
    <section className="py-16 bg-black/30" data-testid="section-team">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {team.map((member, i) => (
            <Card key={i} className="bg-white/5 border-white/10 text-white text-center" data-testid={`card-team-${i}`}>
              <CardContent className="p-6">
                <div 
                  className="h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: `${colors.primary}20` }}
                >
                  {member.image ? (
                    <img src={member.image} alt={member.name} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <Users className="h-10 w-10" style={{ color: colors.primary }} />
                  )}
                </div>
                <h3 className="font-bold">{member.name}</h3>
                <p className="text-sm" style={{ color: colors.primary }}>{member.role}</p>
                {member.bio && <p className="text-sm text-white/60 mt-2">{member.bio}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection({ lead, colors, section }: SectionProps) {
  const faqs = parseJSON<FAQItem[]>(lead.siteFAQ, [
    { question: "Qual o horario de funcionamento?", answer: "Funcionamos de segunda a sabado, das 8h as 18h." },
    { question: "Aceitam cartao?", answer: "Sim, aceitamos todas as bandeiras de credito e debito." },
    { question: "Fazem entrega?", answer: "Sim, fazemos entregas em toda a regiao." },
  ]);

  return (
    <section className="py-16" data-testid="section-faq">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>
        </div>
        <div className="max-w-2xl mx-auto">
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, i) => (
              <AccordionItem 
                key={i} 
                value={`faq-${i}`}
                className="bg-white/5 border border-white/10 rounded-lg px-4"
                data-testid={`accordion-faq-${i}`}
              >
                <AccordionTrigger className="text-left text-white hover:no-underline">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="h-5 w-5 flex-shrink-0" style={{ color: colors.primary }} />
                    <span>{faq.question}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-white/70 pl-8">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

function AboutSection({ lead, colors, section }: SectionProps) {
  const about = lead.siteAbout || `${lead.businessName} e referencia em qualidade e atendimento. Venha nos conhecer!`;
  const categoryImages = FALLBACK_IMAGES[lead.category as keyof typeof FALLBACK_IMAGES] || FALLBACK_IMAGES.generic;
  const image = lead.heroImageUrl || categoryImages.hero;

  return (
    <section className="py-16 bg-black/30" data-testid="section-about">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">{section.title}</h2>
            <p className="text-white/70 leading-relaxed whitespace-pre-line">{about}</p>
          </div>
          <div className="relative">
            <div 
              className="absolute -inset-4 rounded-3xl opacity-20 blur-2xl"
              style={{ backgroundColor: colors.primary }}
            />
            <img 
              src={image} 
              alt={lead.businessName} 
              className="relative rounded-2xl w-full aspect-video object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function GallerySection({ lead, colors, section }: SectionProps) {
  const categoryImages = FALLBACK_IMAGES[lead.category as keyof typeof FALLBACK_IMAGES] || FALLBACK_IMAGES.generic;
  const galleryImages = (lead.siteGallery && lead.siteGallery.length > 0) 
    ? lead.siteGallery 
    : (lead.productImages && lead.productImages.length > 0)
    ? lead.productImages
    : categoryImages.products;

  return (
    <section className="py-16" data-testid="section-gallery">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {galleryImages.slice(0, 8).map((image, i) => (
            <div 
              key={i} 
              className="aspect-square rounded-lg overflow-hidden border-2 transition-transform hover:scale-105"
              style={{ borderColor: `${colors.primary}40` }}
              data-testid={`gallery-image-${i}`}
            >
              <img src={image} alt={`Galeria ${i + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BookingSection({ lead, colors, section, whatsappUrl }: SectionProps) {
  return (
    <section className="py-16 bg-black/30" data-testid="section-booking">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div 
            className="h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: `${colors.primary}20` }}
          >
            <Calendar className="h-8 w-8" style={{ color: colors.primary }} />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>
          <p className="text-white/70 mb-8">Entre em contato para agendar seu horario. Estamos prontos para atende-lo!</p>
          {lead.phone && (
            <Button 
              asChild 
              size="lg"
              style={{ backgroundColor: colors.primary }}
              className="text-white border-0"
              data-testid="button-booking-cta"
            >
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-5 w-5" />
                Agendar pelo WhatsApp
              </a>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

function ContactSection({ lead, colors, section, whatsappUrl }: SectionProps) {
  return (
    <section className="py-16" data-testid="section-contact">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
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
                    <h3 className="font-semibold mb-1">Telefone</h3>
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
                  <h3 className="font-semibold mb-1">Horario</h3>
                  <p className="text-sm text-white/70">Seg-Sex: 8h-18h</p>
                  <p className="text-sm text-white/70">Sab: 8h-14h</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        {lead.address && (
          <div className="max-w-4xl mx-auto">
            <div className="rounded-2xl overflow-hidden border border-white/10">
              <iframe
                src={`https://maps.google.com/maps?q=${encodeURIComponent(lead.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                width="100%"
                height="300"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Localizacao"
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function PortfolioSection({ lead, colors, section }: SectionProps) {
  return <GallerySection lead={lead} colors={colors} section={section} category={null as any} whatsappUrl="" />;
}

function CTASection({ lead, colors, section, whatsappUrl }: SectionProps) {
  return <BookingSection lead={lead} colors={colors} section={section} category={null as any} whatsappUrl={whatsappUrl} />;
}

const SECTION_COMPONENTS: Record<string, React.FC<SectionProps>> = {
  hero: HeroSection,
  services: ServicesSection,
  products: ProductsSection,
  schedule: ScheduleSection,
  testimonials: TestimonialsSection,
  features: FeaturesSection,
  menu: MenuSection,
  events: EventsSection,
  pricing: PricingSection,
  team: TeamSection,
  faq: FAQSection,
  about: AboutSection,
  gallery: GallerySection,
  booking: BookingSection,
  contact: ContactSection,
  portfolio: PortfolioSection,
  cta: CTASection,
};

function PreviewTemplate({ lead }: { lead: Lead }) {
  const businessType = lead.businessType;
  const category = businessCategories.find(c => c.id === businessType) || businessCategories.find(c => c.id === "restaurant");
  
  if (!category) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p>Categoria nao encontrada</p>
      </div>
    );
  }

  const colors: ThemeColors = {
    primary: lead.sitePrimaryColor || category.primaryColor,
    secondary: lead.siteSecondaryColor || category.secondaryColor,
    bg: "#1a1a1a",
  };

  const whatsappNumber = lead.phone?.replace(/\D/g, "") || "";
  const whatsappUrl = `https://wa.me/55${whatsappNumber}`;
  const city = lead.city || lead.address?.split(",").pop()?.trim() || "sua cidade";
  
  const IconComponent = ICON_MAP[category.icon] || Building2;

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg, color: "#ffffff" }}>
      <header className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="h-10 w-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: colors.primary }}
            >
              <IconComponent className="h-5 w-5 text-white" />
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
                {category.defaultCTAs[0] || "Contato"}
              </a>
            </Button>
          )}
        </div>
      </header>

      {category.sections.map((section) => {
        const SectionComponent = SECTION_COMPONENTS[section.type];
        if (!SectionComponent) return null;
        return (
          <SectionComponent
            key={section.id}
            lead={lead}
            colors={colors}
            section={section}
            category={category}
            whatsappUrl={whatsappUrl}
          />
        );
      })}

      <footer className="py-12 bg-black border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="h-10 w-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: colors.primary }}
                >
                  <IconComponent className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold">{lead.businessName}</h3>
                  <p className="text-xs text-white/60">{city}</p>
                </div>
              </div>
              <p className="text-sm text-white/60">{category.labelPt} de qualidade em {city}.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Links Rapidos</h4>
              <ul className="space-y-2 text-sm text-white/60">
                {category.defaultServices.slice(0, 3).map((service, i) => (
                  <li key={i}><a href="#" className="hover:text-white transition-colors">{service}</a></li>
                ))}
              </ul>
            </div>
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
            <div>
              <h4 className="font-semibold mb-4">Redes Sociais</h4>
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
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-white/10">
            <p className="text-sm text-white/40">
              {new Date().getFullYear()} {lead.businessName}. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>

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
