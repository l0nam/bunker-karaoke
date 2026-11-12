"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArchiveBoxIcon,
  ArrowUpRightIcon,
  DiscordLogoIcon,
  HouseIcon,
  LockKeyIcon,
  MicrophoneStageIcon,
} from "@phosphor-icons/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
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
import { ThemeToggle } from "@/components/ThemeToggle";

const SITE_NAME = "Бункер-оке";
const SITE_TAGLINE = "Голоса из убежища";

const DISCORD_URL =
  process.env.NEXT_PUBLIC_DISCORD_URL ?? "https://discord.gg/bunkeronline";

type NavKey = "home" | "archive";

const NAV_ITEMS = [
  {
    key: "home",
    href: "/",
    label: "Главная",
    icon: HouseIcon,
  },
  {
    key: "archive",
    href: "/archive",
    label: "Песенный архив",
    icon: ArchiveBoxIcon,
  },
] as const satisfies ReadonlyArray<{
  key: NavKey;
  href: string;
  label: string;
  icon: typeof HouseIcon;
}>;

type Props = {
  active?: NavKey;
  children: ReactNode;
};

function PublicNavigationContent({ active, children }: Props) {
  const activeLabel = NAV_ITEMS.find((item) => item.key === active)?.label;

  return (
    <>
      <Sidebar
        side="left"
        variant="floating"
        collapsible="offcanvas"
        className="md:fixed! md:translate-x-0! md:left-0!"
      >
        <SidebarHeader className="p-3">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MicrophoneStageIcon className="size-5.5" weight="fill" />
            </span>

            <span className="min-w-0">
              <span className="block truncate font-heading font-bold">
                {SITE_NAME}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {SITE_TAGLINE}
              </span>
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Навигация</SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map(({ key, href, label, icon: Icon }) => {
                  const isActive = active === key;

                  return (
                    <SidebarMenuItem key={key}>
                      <SidebarMenuButton
                        render={<Link href={href} />}
                        isActive={isActive}
                        tooltip={label}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <Icon weight={isActive ? "fill" : "bold"} />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={
                  <Link href={DISCORD_URL} target="_blank" rel="noreferrer" />
                }
                tooltip="Discord-сервер Bunker Online"
              >
                <DiscordLogoIcon weight="fill" />
                <span>Discord-сервер</span>
                <ArrowUpRightIcon
                  weight="bold"
                  className="ml-auto text-muted-foreground"
                />
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/host" />}
                variant="default"
                size="lg"
                tooltip="Вход для ведущего"
              >
                <LockKeyIcon weight="bold" />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate">Панель ведущего</span>
                  <span className="truncate text-xs text-primary/70">
                    Вход по паролю
                  </span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <div className="flex items-center justify-between rounded-xl border border-sidebar-border px-3 py-2">
            <span className="text-sm text-muted-foreground">Оформление</span>
            <ThemeToggle />
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-background/85 px-4 backdrop-blur md:hidden">
          <SidebarTrigger />

          <span className="font-heading text-sm font-bold">{SITE_NAME}</span>
          <span className="ml-auto truncate text-xs text-muted-foreground">
            {activeLabel}
          </span>
          <ThemeToggle />
        </header>

        {children}
      </SidebarInset>
    </>
  );
}

export function PublicNavigation({ active, children }: Props) {
  return (
    <TooltipProvider delay={0}>
      <SidebarProvider defaultOpen>
        <PublicNavigationContent active={active}>
          {children}
        </PublicNavigationContent>
      </SidebarProvider>
    </TooltipProvider>
  );
}
