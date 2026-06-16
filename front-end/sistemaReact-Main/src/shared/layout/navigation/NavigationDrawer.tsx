import { useMemo } from "react";
import {
  Typography,
  List,
  ListItem,
  Accordion,
  AccordionHeader,
  AccordionBody,
  Drawer,
  Card,
} from "@material-tailwind/react";
import type { Usuario } from "@/types/Usuario";
import type { NavDestination } from "../navigationConfig";
import { isNavDestinationActive } from "../navigationConfig";
import { ThemeMenuButton } from "@/components/theme/ThemeMenuButton";
import { MaterialIcon } from "@/shared/ui";

interface DrawerNavItemProps {
  icon: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}

function DrawerNavItem({ icon, label, selected, onClick }: DrawerNavItemProps) {
  return (
    <ListItem
      selected={selected}
      onClick={onClick}
      className={`relative overflow-hidden group rounded-xl py-3 px-4 transition-all duration-200 border border-transparent flex items-center active:scale-[0.98] ${
        selected ? "app-drawer-nav-item-selected shadow-lg shadow-black/20" : "app-drawer-nav-item"
      }`}
    >
      <div className="mr-3.5 flex-shrink-0 flex items-center justify-center">
        <MaterialIcon
          icon={icon}
          className={`h-[20px] w-[20px] transition-colors app-drawer-text ${selected ? "" : "opacity-70 group-hover:opacity-100"}`}
        />
      </div>
      <span className="text-[14px] font-medium tracking-tight truncate app-drawer-text">{label}</span>
    </ListItem>
  );
}

interface NavigationDrawerProps {
  open: boolean;
  onClose: () => void;
  destinations: NavDestination[];
  vistaActual: string;
  usuario: Usuario | null;
  roleLabel: string;
  openAccordion: number;
  onAccordionOpen: (value: number) => void;
  onNavigate: (dest: NavDestination) => void;
  onLogout: () => void;
}

export function NavigationDrawer({
  open,
  onClose,
  destinations,
  vistaActual,
  usuario,
  roleLabel,
  openAccordion,
  onAccordionOpen,
  onNavigate,
  onLogout,
}: NavigationDrawerProps) {
  const itemsWithSections = useMemo(() => {
    let lastSection: string | undefined;
    return destinations.map((dest) => {
      const showSection = Boolean(dest.section && dest.section !== lastSection);
      if (showSection && dest.section) {
        lastSection = dest.section;
      }
      return { dest, showSection, section: dest.section };
    });
  }, [destinations]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      transition={{ type: "tween", duration: 0.22 }}
      className="app-drawer z-[50] border-r border-[var(--app-drawer-border)] shadow-2xl md:hidden"
      overlay={true}
      placement="left"
      size={300}
      overlayProps={{
        className:
          "fixed inset-0 z-[45] bg-black/40 will-change-[opacity] pointer-events-auto " +
          "[-webkit-tap-highlight-color:transparent]",
      }}
    >
      <Card
        color="transparent"
        shadow={false}
        className="app-drawer-shell h-full w-full flex flex-col pt-4 overflow-hidden !bg-[var(--app-drawer-bg)]"
      >
        <div className="px-6 py-8 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 flex-shrink-0 rounded-xl app-drawer-theme-icon-wrap flex items-center justify-center shadow-xl">
              <span className="text-sm font-black app-drawer-text tracking-widest">DK</span>
            </div>
            <div className="flex flex-col min-w-0">
              <Typography className="text-base font-bold app-drawer-text truncate leading-tight tracking-tight">
                {usuario?.usuario ?? "Usuario"}
              </Typography>
              <Typography className="text-[11px] font-medium app-drawer-muted tracking-wider uppercase mt-1">
                {roleLabel}
              </Typography>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 app-drawer-nav-item transition-colors rounded-xl group flex items-center justify-center"
            aria-label="Cerrar menú"
          >
            <MaterialIcon icon="menu_open" className="h-5 w-5 app-drawer-muted group-hover:app-drawer-text" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
          <List className="p-0 space-y-2">
            {itemsWithSections.map(({ dest, showSection, section }) => {
              const sectionHeader = showSection ? (
                <p className="px-5 pb-3 pt-2 text-[10px] font-bold app-drawer-muted tracking-[0.15em] uppercase">
                  {section}
                </p>
              ) : null;

              if (dest.children?.length && dest.accordionId) {
                const accordionOpen = openAccordion === dest.accordionId;
                return (
                  <div key={dest.id} className="py-2">
                    {sectionHeader}
                    <Accordion open={accordionOpen} className="border-none">
                      <ListItem className="p-0" selected={accordionOpen}>
                        <AccordionHeader
                          onClick={() => onAccordionOpen(dest.accordionId!)}
                          className="border-none p-0"
                        >
                          <div
                            className={`w-full flex items-center py-3 px-4 rounded-xl transition-all duration-200 active:scale-[0.98] ${
                              accordionOpen || isNavDestinationActive(dest, vistaActual)
                                ? "app-drawer-nav-item-selected"
                                : "app-drawer-nav-item"
                            }`}
                          >
                            <div className="mr-3.5 flex-shrink-0 flex items-center justify-center">
                              <MaterialIcon
                                icon={dest.icon}
                                className="h-[20px] w-[20px] app-drawer-text opacity-90"
                              />
                            </div>
                            <span className="text-[14px] font-medium flex-1 text-left tracking-tight">
                              {dest.label}
                            </span>
                            <MaterialIcon
                              icon="expand_more"
                              className={`h-4 w-4 transition-transform ${accordionOpen ? "rotate-180" : ""}`}
                            />
                          </div>
                        </AccordionHeader>
                      </ListItem>
                      <AccordionBody className="py-2 pl-4 pr-1">
                        <List className="p-0 space-y-1.5">
                          {dest.children.map((child) => (
                            <DrawerNavItem
                              key={child.id}
                              icon={child.icon}
                              label={child.label}
                              selected={isNavDestinationActive(child, vistaActual)}
                              onClick={() => onNavigate(child)}
                            />
                          ))}
                        </List>
                      </AccordionBody>
                    </Accordion>
                  </div>
                );
              }

              return (
                <div key={dest.id}>
                  {sectionHeader}
                  <DrawerNavItem
                    icon={dest.icon}
                    label={dest.label}
                    selected={isNavDestinationActive(dest, vistaActual)}
                    onClick={() => onNavigate(dest)}
                  />
                </div>
              );
            })}
          </List>
        </div>

        <div className="mt-auto border-t border-[var(--app-drawer-border)] flex flex-col bg-black/10">
          <ThemeMenuButton />
          <div className="px-4 pb-6 pt-1">
            <ListItem
              onClick={onLogout}
              className="group rounded-xl py-4 px-4 transition-all duration-200 active:scale-[0.98] text-red-500/80 hover:bg-red-500/10 hover:text-red-400 flex items-center border border-transparent hover:border-red-500/20"
            >
              <div className="mr-3.5 flex-shrink-0 flex items-center justify-center">
                <MaterialIcon
                  icon="logout"
                  className="h-[20px] w-[20px] transform group-hover:-translate-x-1 transition-transform"
                />
              </div>
              <span className="text-[14px] font-bold tracking-tight">Cerrar Sesión</span>
            </ListItem>
          </div>
        </div>
      </Card>
    </Drawer>
  );
}
