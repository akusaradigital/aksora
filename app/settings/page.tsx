import { PageShell } from"@/components/layout/page-shell";
import { Users, Gear, CaretRight, Info, Lock, Bell, Buildings, Moon, WebhooksLogo } from"@phosphor-icons/react/dist/ssr";
import Link from"next/link";
import { getCurrentUser } from"@/lib/auth";
import { isManagementAdmin } from"@/lib/roles";
import { redirect } from"next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
 const user = await getCurrentUser();
 if (!user) redirect("/login");
 if (!isManagementAdmin(user.role, user.company)) redirect("/settings/profile");
 const settingsGroups = [
 {
 title:"Personal",
 description:"Manage your own account information and preferences.",
 items: [
        {
          title: "My Profile",
          description: "Update your name, role, and view your account details.",
          href: "/settings/profile",
          icon: Gear,
          color: "text-indigo-600",
          bg: "bg-indigo-50",
          disabled: false,
        },
        {
          title: "API Keys",
          description: "Manage personal API keys for REST API integrations and scripts.",
          href: "/settings/api-keys",
          icon: Lock,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
          disabled: false,
        },
        {
          title: "Webhooks",
          description: "Push real-time notifications to your own HTTP endpoint when data changes.",
          href: "/settings/webhooks",
          icon: WebhooksLogo,
          color: "text-cyan-600",
          bg: "bg-cyan-50",
          disabled: false,
        },
        {
          title: "Workspace",
          description: "View workspace details, plan subscription, and user limit metrics.",
          href: "/settings/workspace",
          icon: Buildings,
          color: "text-blue-600",
          bg: "bg-blue-50",
          disabled: false,
        },
 {
 title:"Notifications",
 description:"Choose what alerts you receive and how often.",
 href:"/settings/notifications",
 icon: Bell,
 color:"text-amber-600",
 bg:"bg-amber-50",
 disabled: false,
 },
 ],
 },
 {
 title:"System Settings",
 description:"Manage people, roles, and permissions in your workspace.",
 items: [
 {
 title:"Assignees",
 description:"Manage the list of people available for task assignments and test execution.",
 href:"/assignees",
 icon: Users,
 color:"text-blue-600",
 bg:"bg-blue-50",
 disabled: false,
 },
 {
 title:"User Management",
 description:"Manage system access, roles, and credentials for all users.",
 href:"/settings/users",
 icon: Lock,
 color:"text-rose-600",
 bg:"bg-rose-50",
 disabled: false,
 },
 ],
 },
 {
 title:"Application",
 description:"General workspace configuration and metadata.",
 items: [
 {
 title:"General Settings",
 description:"Configure workspace name, timezone, and regional preferences.",
 href:"#",
 icon: Gear,
 color:"text-gray-600",
 bg:"bg-gray-50",
 disabled: true
 },
 {
 title:"Appearance",
 description:"Choose light, dark, or system theme.",
 href:"/settings/appearance",
 icon: Moon,
 color:"text-purple-600",
 bg:"bg-purple-50",
 disabled: false
 },
 {
 title:"About Aksora",
 description:"Version information, documentation, and system status.",
 href:"#",
 icon: Info,
 color:"text-sky-600",
 bg:"bg-sky-50",
 disabled: true
 }
 ]
 }
 ];

 return (
  <PageShell 
    icon={<Gear size={22} weight="bold" />}
    title="Settings" 
    description="Manage profile, users, assignees, and workspace configuration."
    crumbs={[
      { label: "Dashboard", href: "/dashboard" },
      { label: "Settings" },
    ]}
  >
 <div className="max-w-4xl space-y-12">
 {settingsGroups.map((group, groupIdx) => (
 <div key={groupIdx} className="space-y-4">
 <div>
 <h2 className="text-lg font-bold text-gray-800">{group.title}</h2>
 <p className="text-sm text-gray-500">{group.description}</p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {group.items.map((item, itemIdx) => (
 <div 
 key={itemIdx}
 className={`relative group p-4  border border-gray-200/60 bg-white transition-all duration-150 ${item.disabled ?'opacity-50 grayscale' :'hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10'}`}
 >
 <div className="flex items-start gap-4">
 <div className={`h-10 w-10  flex items-center justify-center shrink-0 ${item.bg}`}>
 <item.icon size={24} weight="bold" className={item.color} />
 </div>
 
 <div className="flex-1 space-y-1">
 <h3 className="font-bold text-gray-800 flex items-center gap-2">
 {item.title}
 {item.disabled && (
 <span className="text-[11px] font-bold uppercase tracking-wider bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">Soon</span>
 )}
 </h3>
 <p className="text-sm text-gray-500 leading-relaxed">
 {item.description}
 </p>
 </div>

 {!item.disabled && (
 <div className="self-center">
 <CaretRight size={18} weight="bold" className="text-gray-300 group-hover:text-blue-500 transition-colors" />
 </div>
 )}
 </div>
 
 {!item.disabled && (
 <Link href={item.href} className="absolute inset-0">
 <span className="sr-only">Go to {item.title}</span>
 </Link>
 )}
 </div>
 ))}
 </div>
 </div>
 ))}

 </div>
 </PageShell>
 );
}

