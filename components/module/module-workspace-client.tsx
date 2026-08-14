"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { ModuleWorkspaceProps } from "@/components/module/module-workspace";

const ModuleWorkspaceClient = dynamic(
  () => import("@/components/module/module-workspace").then((module) => module.ModuleWorkspace as ComponentType<ModuleWorkspaceProps>),
  {
    ssr: false,
    loading: () => <div className="min-h-[60vh]" />,
  },
) as ComponentType<ModuleWorkspaceProps>;

export type ModuleWorkspaceClientProps = ModuleWorkspaceProps;

export function ModuleWorkspaceClientWrapper(props: ModuleWorkspaceClientProps) {
  return <ModuleWorkspaceClient {...props} />;
}

