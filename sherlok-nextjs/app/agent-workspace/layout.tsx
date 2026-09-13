import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AgentWorkspaceLayout({
  children,
}: LayoutProps<"/agent-workspace">) {
  return children;
}
