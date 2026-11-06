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
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

const SITE_NAME = "Бункер-оке";
const SITE_TAGLINE = "Голоса из убежища";

const DISCORD_URL =
  process.env.NEXT_PUBLIC_DISCORD_URL ?? "https://discord.gg/bunkeronline";

type NavKey = "home" | "archive";

const NAV_ITEMS = [
  { key: "home", href: "/", label: "Главная", icon: HouseIcon },
  { key: "archive", href: "/archive", label: "Песенный архив", icon: ArchiveBoxIcon },
] as const satisfies ReadonlyArray<{
  key: NavKey;
  href: string;
  label: string;
  icon: typeof HouseIcon;
}>;

type Props = {
  active: NavKey;
  children: ReactNode;
};

export function PublicNavigation({ active, children }: Props) {
  const activeLabel = NAV_ITEMS.find((item) => item.key === active)?.label;

  return (
    <TooltipProvider delay={0}>
      <SidebarProvider defaultOpen>
        <Sidebar collapsible="icon" variant="inset">
          <SidebarHeader className="p-3 group-data-[collapsible=icon]:p-2">
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col">
              <Link
                href="/"
                aria-label={`${SITE_NAME} — главная`}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg outline-hidden ring-sidebar-ring focus-visible:ring-2 group-data-[collapsible=icon]:flex-none"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-pink-500 via-fuchsia-500 to-violet-600 text-white shadow-lg shadow-pink-500/25 ring-1 ring-white/15 group-data-[collapsible=icon]:size-8">
                  <MicrophoneStageIcon className="size-5" weight="fill" />
                </span>
                <span className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="block truncate font-heading text-base font-extrabold tracking-tight">
                    {SITE_NAME}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {SITE_TAGLINE}
                  </span>
                </span>
              </Link>
              <SidebarTrigger className="shrink-0" />
            </div>
          </SidebarHeader>

          <SidebarSeparator />

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
                          className="relative data-active:text-primary data-active:before:absolute data-active:before:inset-y-1.5 data-active:before:left-0 data-active:before:w-0.5 data-active:before:rounded-full data-active:before:bg-primary"
                        >
                          <Icon weight={isActive ? "fill" : "duotone"} />
                          <span>{label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarSeparator />

          <SidebarFooter className="p-3 group-data-[collapsible=icon]:p-2">
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
                    className="ml-auto text-muted-foreground group-data-[collapsible=icon]:hidden"
                  />
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/host" />}
                  variant="outline"
                  size="lg"
                  tooltip="Вход для ведущего"
                  className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                >
                  <LockKeyIcon weight="duotone" />
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate font-semibold">
                      Панель ведущего
                    </span>
                    <span className="truncate text-xs font-normal text-primary/70">
                      Вход по паролю
                    </span>
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>

          <SidebarRail />
        </Sidebar>

        <SidebarInset>
          <div className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/60 bg-background/85 px-4 backdrop-blur md:hidden">
            <SidebarTrigger />
            <span className="font-heading text-sm font-bold">{SITE_NAME}</span>
            <span className="ml-auto truncate text-xs text-muted-foreground">
              {activeLabel}
            </span>
          </div>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
