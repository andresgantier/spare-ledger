import {
  ArrowLeftRight,
  Boxes,
  Factory,
  LayoutDashboard,
  Package,
  Truck,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_SECTIONS: { title: string | null; items: NavItem[] }[] = [
  {
    title: null,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/stock", label: "Stock", icon: Boxes },
      { href: "/movements", label: "Movements", icon: ArrowLeftRight },
    ],
  },
  {
    title: "Master data",
    items: [
      { href: "/materials", label: "Materials", icon: Package },
      { href: "/suppliers", label: "Suppliers", icon: Truck },
      { href: "/locations", label: "Locations", icon: Warehouse },
      { href: "/equipment", label: "Equipment", icon: Factory },
    ],
  },
];
