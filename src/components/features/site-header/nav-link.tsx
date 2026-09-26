"use client";

import type { MouseEventHandler, ReactNode } from "react";

import { Link, usePathname } from "@/lib/i18n/navigation";
import { isActive } from "@/lib/navigation/is-active";
import type { NavItem } from "@/lib/navigation/nav-items";
import { cn } from "@/lib/utils/cn";

type NavLinkProps = {
  href: NavItem["href"];
  children: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

export function NavLink({ href, children, className, onClick }: NavLinkProps) {
  // Locale-free pathname, so it compares directly with the nav hrefs.
  const pathname = usePathname();
  const active = isActive(pathname, href);

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-10 items-center rounded-md px-3 text-sm",
        "transition-colors duration-fast ease-snap",
        // Active state is carried by weight and underline too, not only by color.
        active
          ? "font-semibold text-fg underline decoration-brand decoration-2 underline-offset-8"
          : "font-medium text-fg-muted hover:bg-surface-2 hover:text-fg",
        className,
      )}
    >
      {children}
    </Link>
  );
}
