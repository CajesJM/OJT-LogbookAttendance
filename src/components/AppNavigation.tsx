import { LayoutDashboard, NotebookPen, Plus, UserRound } from "lucide-react";
import type { Tab } from "../types";

type Props = {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
  onAddRecord: () => void;
};

const items = [
  { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { id: "records" as const, label: "Daily Records", icon: NotebookPen },
  { id: "profile" as const, label: "Profile", icon: UserRound },
];

export function AppNavigation({ activeTab, onChange, onAddRecord }: Props) {
  return (
    <nav className="bottom-nav print-hide" aria-label="Main navigation">
      <div className="bottom-nav-tabs">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            className={`bottom-nav-tab${activeTab === id ? " active" : ""}`}
            onClick={() => onChange(id)}
            aria-current={activeTab === id ? "page" : undefined}
            aria-label={label}
            title={label}
          >
            <Icon
              size={19}
              strokeWidth={activeTab === id ? 2.3 : 1.8}
              aria-hidden="true"
            />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <button
        className="bottom-nav-add"
        type="button"
        onClick={onAddRecord}
        aria-label="Add a new daily record"
        title="Add daily record"
      >
        <Plus size={22} strokeWidth={2.2} aria-hidden="true" />
      </button>
    </nav>
  );
}
