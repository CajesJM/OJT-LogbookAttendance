import { LayoutDashboard, NotebookPen, UserRound } from "lucide-react";
import type { Tab } from "../types";

type Props = {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
};

const items = [
  { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { id: "records" as const, label: "Daily Records", icon: NotebookPen },
  { id: "profile" as const, label: "Profile", icon: UserRound },
];

export function AppNavigation({ activeTab, onChange }: Props) {
  return (
    <nav className="bottom-nav print-hide" aria-label="Main navigation">
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={activeTab === id ? "active" : ""}
          onClick={() => onChange(id)}
          aria-current={activeTab === id ? "page" : undefined}
          aria-label={label}
          title={label}
        >
          <Icon size={20} strokeWidth={activeTab === id ? 2.35 : 1.8} aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
