import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArchiveBoxIcon,
  BroadcastIcon,
  HouseIcon,
  MicrophoneStageIcon,
} from "@phosphor-icons/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

type Props = {
  active: "home" | "archive";
  children: ReactNode;
};

export function PublicNavigation({ active, children }: Props) {
  return (
    <TooltipProvider delay={0}>
      <SidebarProvider defaultOpen>
        <Sidebar collapsible="icon" variant="inset">
          <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
            <div className="flex min-w-0 items-center gap-2">
              <Link
                href="/"
                aria-label="Bunker Karaoke — главная"
                className="flex min-w-0 items-center gap-2.5"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
                  <MicrophoneStageIcon className="size-5" weight="duotone" />
                </span>
                <span className="min-w-0 group-data-[collapsible=icon]:hidden">
                  <span className="block truncate font-heading text-sm font-bold">
                    Bunker Karaoke
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Музыка объединяет
                  </span>
                </span>
              </Link>
              <SidebarTrigger className="ml-auto shrink-0" />
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Навигация</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href="/" />}
                    isActive={active === "home"}
                    tooltip="Сейчас"
                  >
                    <HouseIcon weight="duotone" />
                    <span>Сейчас</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href="/archive" />}
                    isActive={active === "archive"}
                    tooltip="Песенный архив"
                  >
                    <ArchiveBoxIcon weight="duotone" />
                    <span>Песенный архив</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border p-3">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/host" />}
                  variant="outline"
                  size="lg"
                  tooltip="Панель ведущего"
                  className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                >
                  <MicrophoneStageIcon weight="duotone" />
                  <span className="font-semibold">Панель ведущего</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {process.env.NEXT_PUBLIC_DISCORD_URL && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={
                      <Link
                        href={process.env.NEXT_PUBLIC_DISCORD_URL}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                    tooltip="Сообщество в Discord"
                  >
                    <BroadcastIcon weight="duotone" />
                    <span>Наш Discord</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
            <p className="px-2 pt-2 text-[11px] text-muted-foreground group-data-[collapsible=icon]:hidden">
              Bunker Karaoke
            </p>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <div className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/60 bg-background/85 px-4 backdrop-blur md:hidden">
            <SidebarTrigger />
            <span className="font-heading text-sm font-bold">
              Bunker Karaoke
            </span>
            <span className="ml-auto truncate text-xs text-muted-foreground">
              {active === "home" ? "Сейчас" : "Песенный архив"}
            </span>
          </div>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
