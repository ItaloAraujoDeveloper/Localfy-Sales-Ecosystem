import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Sparkles, 
  Radar, 
  Zap, 
  TrendingUp,
  CheckCircle2,
  ArrowRight
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Localfy</span>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href="/api/login" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-login"
            >
              Entrar
            </a>
            <Button asChild data-testid="button-get-started">
              <a href="/api/login">
                Comecar Agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Ecossistema de Vendas WaaS Automatizado
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Transforme vendas de sites em{" "}
              <span className="gradient-text">
                produto de prateleira
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
              O Localfy encontra empresas sem site, gera automaticamente um site 
              demonstrativo personalizado e entrega essa oportunidade qualificada 
              diretamente na mao do seu vendedor.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="min-w-[200px]" data-testid="button-hero-cta">
                <a href="/api/login">
                  Comecar Gratuitamente
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-accent" />
                <span>Sem cartao de credito</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
            {[
              { value: "5x", label: "Mais conversoes" },
              { value: "2min", label: "Para gerar preview" },
              { value: "0", label: "Custo por demo" },
              { value: "100%", label: "Automatizado" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ciclo completo de vendas automatizado
            </h2>
            <p className="text-muted-foreground">
              Do descobrimento do lead ate o fechamento da venda, tudo em uma unica plataforma.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg hover-elevate">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Radar className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Lead Radar</h3>
                <p className="text-sm text-muted-foreground">
                  Encontre automaticamente empresas sem presenca digital na regiao desejada.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover-elevate">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Magic Builder</h3>
                <p className="text-sm text-muted-foreground">
                  Gere sites demonstrativos automaticamente com dados reais do negocio.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover-elevate">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-xl bg-chart-3/10 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-chart-3" />
                </div>
                <h3 className="text-lg font-semibold mb-2">CRM Kanban</h3>
                <p className="text-sm text-muted-foreground">
                  Gerencie todo o pipeline de vendas visualmente com metricas em tempo real.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover-elevate">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-xl bg-chart-5/10 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-chart-5" />
                </div>
                <h3 className="text-lg font-semibold mb-2">App do Parceiro</h3>
                <p className="text-sm text-muted-foreground">
                  Interface mobile-first para seus vendedores converterem na rua.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Como funciona
            </h2>
            <p className="text-muted-foreground">
              Em 5 passos simples, converta leads em clientes WaaS
            </p>
          </div>

          <div className="space-y-8">
            {[
              {
                step: "01",
                title: "Radar descobre leads",
                desc: "O sistema varre APIs de mapas buscando estabelecimentos sem website.",
              },
              {
                step: "02",
                title: "Filtro e captura",
                desc: "Identifica automaticamente quem nao possui website cadastrado.",
              },
              {
                step: "03",
                title: "Magic Builder gera o site",
                desc: "Cria um preview exclusivo com dados reais do negocio em segundos.",
              },
              {
                step: "04",
                title: "Distribuicao inteligente",
                desc: "O lead qualificado e atribuido ao vendedor mais proximo.",
              },
              {
                step: "05",
                title: "Conversao via WhatsApp",
                desc: "O vendedor envia o link, o cliente ve o site pronto e fecha a assinatura.",
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-6 items-start">
                <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pronto para automatizar suas vendas?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Junte-se a centenas de agencias que ja estao transformando a forma de vender sites.
          </p>
          <Button 
            size="lg" 
            variant="secondary" 
            asChild
            data-testid="button-cta-bottom"
          >
            <a href="/api/login">
              Criar conta gratuita
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold">Localfy</span>
          </div>
          <p className="text-sm text-muted-foreground">
            2024 Localfy. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
