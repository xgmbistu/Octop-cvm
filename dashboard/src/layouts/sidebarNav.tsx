import type { ReactNode } from "react";
import {
  Monitor,
  MessageSquareText,
  Timer,
  SlidersHorizontal,
  Waypoints,
  Link2,
  Database,
  Cpu,
  Users as UsersIcon,
  Activity,
  Share2,
  Sparkles,
  Puzzle,
  Package,
  FolderOpen,
  GraduationCap,
  Shield,
  PanelsTopLeft,
} from "lucide-react";
import type { OctopUser } from "../api/modules/auth";
import { navAllowed, userCan } from "../utils/permissions";

export const EXPANDED_WIDTH = 220;
export const COLLAPSED_WIDTH = 56;

const iconSize = 16;
const iconStroke = 1.8;

export interface NavItem {
  key: string;
  path: string;
  icon: ReactNode;
  labelKey: string;
  badge?: string;
}

export interface NavSection {
  /** When omitted, items render flat without a group header. */
  groupKey?: string;
  items: NavItem[];
}

/**
 * Catalog of nav item keys that live under settings / control / admin groups.
 * Permission-independent — used for pane/route helpers; visibility still
 * comes from {@link buildNavSections}.
 */
export const SIDEBAR_GROUPED_NAV_KEYS = [
  "personalization",
  "channels",
  "connectors",
  "skill-packages",
  "knowledge-bases",
  "workbench",
  "remote-desktop",
  "acp",
  "admin-users",
  "models",
  "admin-storage",
  "admin-plugins",
  "admin-security",
  "admin-advanced",
  "agent-config",
] as const;

const GROUPED_NAV_KEY_SET = new Set<string>(SIDEBAR_GROUPED_NAV_KEYS);

export function isGroupedNavKey(key: string): boolean {
  return GROUPED_NAV_KEY_SET.has(key);
}

/**
 * The "设置" (nav.settings) destinations — personalization, channels,
 * connectors, skill packages, knowledge bases. These used to render as a
 * standalone group in the left sidebar; they now surface from inside the
 * account "个人设置" (Personal Settings) panel instead (see AvatarDropdown),
 * so this list is exported for reuse there rather than pushed into
 * {@link buildNavSections}'s sections.
 */
export function buildAccountSettingsNavItems(user: OctopUser | null): NavItem[] {
  const items: NavItem[] = [
    {
      key: "personalization",
      path: "/personalization/skills",
      icon: <Sparkles size={iconSize} strokeWidth={iconStroke} />,
      labelKey: "nav.personalization",
    },
  ];
  if (navAllowed(user, "channels")) {
    items.push({
      key: "channels",
      path: "/personalization/channels",
      icon: <Waypoints size={iconSize} strokeWidth={iconStroke} />,
      labelKey: "nav.channels",
    });
  }
  if (navAllowed(user, "connectors")) {
    items.push({
      key: "connectors",
      path: "/connectors",
      icon: <Link2 size={iconSize} strokeWidth={iconStroke} />,
      labelKey: "nav.connectors",
    });
  }
  if (navAllowed(user, "skill-packages")) {
    items.push({
      key: "skill-packages",
      path: "/skill-packages",
      icon: <Package size={iconSize} strokeWidth={iconStroke} />,
      labelKey: "nav.skillPackages",
    });
  }
  if (navAllowed(user, "knowledge-bases")) {
    items.push({
      key: "knowledge-bases",
      path: "/knowledge-bases",
      icon: <Database size={iconSize} strokeWidth={iconStroke} />,
      labelKey: "nav.knowledgeBases",
    });
  }
  return items;
}

export function buildNavSections(
  user: OctopUser | null,
  opts?: { mobileEnabled?: boolean },
): NavSection[] {
  const sections: NavSection[] = [
    {
      items: [
        {
          key: "chat",
          path: "/chat",
          icon: <MessageSquareText size={iconSize} strokeWidth={iconStroke} />,
          labelKey: "nav.chat",
        },
        {
          key: "experts",
          path: "/experts",
          icon: <GraduationCap size={iconSize} strokeWidth={iconStroke} />,
          labelKey: "nav.experts",
        },
        {
          key: "tasks",
          path: "/tasks",
          icon: <Timer size={iconSize} strokeWidth={iconStroke} />,
          labelKey: "nav.tasks",
        },
        {
          key: "token-usage",
          path: "/token-usage",
          icon: <Activity size={iconSize} strokeWidth={iconStroke} />,
          labelKey: "nav.tokenUsage",
        },
      ],
    },
  ];

  // The "设置" group (personalization/channels/connectors/skill-packages/
  // knowledge-bases) no longer renders as its own section in the left
  // sidebar — those destinations now live inside the account "个人设置"
  // panel. See buildAccountSettingsNavItems above, used by AvatarDropdown.

  const controlItems: NavItem[] = [];
  if (navAllowed(user, "workbench")) {
    controlItems.push({
      key: "workbench",
      path: "/workbench",
      icon: <PanelsTopLeft size={iconSize} strokeWidth={iconStroke} />,
      labelKey: "nav.workbench",
    });
  }
  // Server desktop + phone share one nav entry; phone tab also needs host capability.
  if (
    userCan(user, "desktop") ||
    (opts?.mobileEnabled && userCan(user, "mobile"))
  ) {
    controlItems.push({
      key: "remote-desktop",
      path: "/remote-desktop",
      icon: <Monitor size={iconSize} strokeWidth={iconStroke} />,
      labelKey: "nav.remoteDesktop",
    });
  }
  // ACP: no module key this round — admin role only.
  if (navAllowed(user, "acp")) {
    controlItems.push({
      key: "acp",
      path: "/acp",
      icon: <Share2 size={iconSize} strokeWidth={iconStroke} />,
      labelKey: "nav.acp",
    });
  }
  if (controlItems.length > 0) {
    sections.push({ groupKey: "nav.control", items: controlItems });
  }

  const adminItems: NavItem[] = [];
  if (navAllowed(user, "admin-users")) {
    adminItems.push({
      key: "admin-users",
      path: "/admin/users",
      icon: <UsersIcon size={iconSize} strokeWidth={iconStroke} />,
      labelKey: "nav.adminUsers",
    });
  }
  if (navAllowed(user, "models")) {
    adminItems.push({
      key: "models",
      path: "/admin/models",
      icon: <Cpu size={iconSize} strokeWidth={iconStroke} />,
      labelKey: "nav.models",
    });
  }
  if (navAllowed(user, "admin-storage")) {
    adminItems.push({
      key: "admin-storage",
      path: "/admin/backend",
      icon: <FolderOpen size={iconSize} strokeWidth={iconStroke} />,
      labelKey: "nav.adminStorage",
    });
  }
  if (navAllowed(user, "admin-plugins")) {
    adminItems.push({
      key: "admin-plugins",
      path: "/admin/plugins",
      icon: <Puzzle size={iconSize} strokeWidth={iconStroke} />,
      labelKey: "nav.adminPlugins",
    });
  }
  if (navAllowed(user, "admin-security")) {
    adminItems.push({
      key: "admin-security",
      path: "/admin/security",
      icon: <Shield size={iconSize} strokeWidth={iconStroke} />,
      labelKey: "nav.security",
    });
  }
  if (navAllowed(user, "admin-advanced")) {
    adminItems.push({
      key: "admin-advanced",
      path: "/admin/advanced",
      icon: <SlidersHorizontal size={iconSize} strokeWidth={iconStroke} />,
      labelKey: "nav.adminAdvanced",
    });
  }
  if (adminItems.length > 0) {
    sections.push({ groupKey: "nav.admin", items: adminItems });
  }
  return sections;
}
