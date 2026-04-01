"use client";

import { useEffect, useRef } from "react";

const STATUS_COLORS: Record<string, string> = {
  todo: "#6b7280",
  "in-progress": "#2563eb",
  done: "#16a34a",
};

function registerStatusBadge() {
  if (customElements.get("status-badge")) return;

  class StatusBadgeElement extends HTMLElement {
    connectedCallback() {
      const shadow = this.attachShadow({ mode: "open" });
      const status = this.getAttribute("status") || "todo";
      const color = STATUS_COLORS[status] ?? STATUS_COLORS.todo;

      const style = document.createElement("style");
      style.textContent = `
        :host {
          display: inline-block;
        }
        .badge {
          display: inline-block;
          padding: 2px 12px;
          border-radius: 9999px;
          color: #fff;
          font-size: 0.75rem;
          font-weight: 600;
          line-height: 1.5;
          background-color: ${color};
        }
      `;

      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = status;

      shadow.appendChild(style);
      shadow.appendChild(badge);
    }
  }

  customElements.define("status-badge", StatusBadgeElement);
}

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    registerStatusBadge();
  }, []);

  // @ts-expect-error -- status-badge is a custom element, not known to JSX typings
  return <status-badge ref={ref} status={status} />;
}
