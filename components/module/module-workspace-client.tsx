"use client";

import dynamic from "next/dynamic";

const ModuleWorkspaceClient = dynamic(
  () => import("@/components/module/module-workspace").then((module) => module.ModuleWorkspace),
  {
    ssr: false,
    loading: () => <div className="min-h-[60vh]" />,
  },
);

export type ModuleWorkspaceClientProps = any;

export function ModuleWorkspaceClientWrapper(props: ModuleWorkspaceClientProps) {
  return <ModuleWorkspaceClient {...props} />;
}

