import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  Radar,
  Kanban,
  Users,
  Sparkles,
  LogOut,
  Settings,
  TableProperties,
  UserCog,
  Target,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";

const adminMenuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Lead Radar",
    url: "/radar",
    icon: Radar,
  },
  {
    title: "CRM Kanban",
    url: "/crm",
    icon: Kanban,
  },
  {
    title: "Controle de Leads",
    url: "/leads",
    icon: TableProperties,
  },
  {
    title: "Vendedores",
    url: "/sellers",
    icon: Users,
  },
  {
    title: "Gerentes",
    url: "/managers",
    icon: UserCog,
  },
];

const managerMenuItems = [
  {
    title: "Lead Radar",
    url: "/radar",
    icon: Radar,
  },
  {
    title: "CRM Kanban",
    url: "/crm",
    icon: Kanban,
  },
  {
    title: "Controle de Leads",
    url: "/leads",
    icon: TableProperties,
  },
  {
    title: "Vendedores",
    url: "/sellers",
    icon: Users,
  },
];

const sellerMenuItems = [
  {
    title: "Meus Leads",
    url: "/my-leads",
    icon: Target,
  },
  {
    title: "CRM Kanban",
    url: "/crm",
    icon: Kanban,
  },
  {
    title: "Minha Carteira",
    url: "/partner",
    icon: LayoutDashboard,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout, isAdmin, isManager } = useAuth();

  // Show menu items based on role
  const menuItems = isAdmin ? adminMenuItems : isManager ? managerMenuItems : sellerMenuItems;

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link href={isAdmin ? "/dashboard" : isManager ? "/radar" : "/partner"} className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-sidebar-foreground">
              Localfy
            </span>
            <span className="text-xs text-sidebar-foreground/60">
              Vendas WaaS
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider mb-2">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    className="transition-colors"
                    data-testid={`nav-${item.url.slice(1)}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider mb-2">
              Vendedor
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sellerMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                      className="transition-colors"
                      data-testid={`nav-${item.url.slice(1)}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-sm">
              {getInitials(user?.firstName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.firstName || "Usuario"} {user?.lastName || ""}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {user?.email || ""}
            </p>
          </div>
          <button
            onClick={() => logout()}
            className="p-2 rounded-md hover-elevate text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
