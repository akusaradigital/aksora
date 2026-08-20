import { PageShell } from"@/components/layout/page-shell";
import { getCurrentUser } from"@/lib/auth";
import { isManagementAdmin } from"@/lib/roles";
import { User, ShieldCheck } from"@phosphor-icons/react/dist/ssr";
import { redirect } from"next/navigation";
import { ProfileForm } from"./profile-form";
import { RestartTourButton } from"@/components/layout/restart-tour-button";

export const dynamic ="force-dynamic";

export default async function ProfilePage() {
 const user = await getCurrentUser();

 if (!user) {
 redirect("/login");
 }

 const { db } = await import("@/lib/db");
 const dbUser = await db.get<{ mfaEnabled: number }>(
   'SELECT "mfaEnabled" FROM "User" WHERE "id" = CAST(? AS INTEGER)',
   [user.id]
 );

 const userWithMfa = {
   ...user,
   mfaEnabled: Boolean(dbUser?.mfaEnabled),
 };

 const isAdmin = isManagementAdmin(user.role, user.company);

 const crumbs = isAdmin
 ? [
 { label:"Dashboard", href:"/dashboard" },
 { label:"Settings", href:"/settings" },
 { label:"Profile" }
 ]
 : [{ label:"Profile" }];

 return (
 <PageShell 
 icon={<User size={22} weight="bold" />}
 title="My Profile" 
 description="View and update your personal information. Your email address is fixed for security."
 crumbs={crumbs}
 >
 <div className="w-full">
 <div className="glass-card overflow-hidden">
 {/* Header/Banner area */}
 <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
 <div className="absolute -bottom-10 left-8">
 <div className="h-20 w-20  bg-white border-4 border-white shadow-md flex items-center justify-center overflow-hidden">
 <div className="h-full w-full bg-gray-50 flex items-center justify-center text-gray-400">
 <User size={40} weight="duotone" />
 </div>
 </div>
 </div>
 </div>

 <div className="pt-14 p-8">
 <div className="mb-8">
 <h2 className="text-xl font-bold text-gray-900">Account Details</h2>
 <p className="text-sm text-gray-500">Manage your identity within the Aksora platform.</p>
 </div>

 <ProfileForm user={JSON.parse(JSON.stringify(userWithMfa))} />
 
 <div className="mt-12 pt-8 border-t border-gray-100">
 <div className="flex items-start gap-4 p-4  bg-gray-50 border border-gray-100">
 <ShieldCheck size={24} className="text-emerald-500 shrink-0" weight="fill" />
 <div>
 <h4 className="text-sm font-bold text-gray-800">Security & Access</h4>
 <p className="text-xs text-gray-500 leading-relaxed mt-1">
 Your account is linked to the <strong>{user.email}</strong> address. 
 Email updates are currently restricted to administrator-only actions to maintain audit log integrity.
 </p>
 </div>
 </div>
 </div>

 <RestartTourButton />
 </div>
 </div>
 </div>
 </PageShell>
 );
}


