/**
 * Help / User Guide Page
 * In-app wiki with role-switcher tabs and screenshot placeholders.
 * Any user can browse all roles' views by switching the "View as" tab.
 * Screenshots go in /public/guide/ — just drop images and they appear automatically.
 */
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Shield,
  Users,
  Calendar,
  CheckSquare,
  FileText,
  UserCog,
  UserCheck,
  Settings,
  LayoutDashboard,
  ImageIcon,
  QrCode,
  BarChart3,
  Globe,
  Smartphone,
  Moon,
  Upload,
  Download,
  Search,
  Key,
  Gauge,
  Lock,
  HelpCircle,
  Lightbulb,
  ArrowUp,
  Eye,
} from 'lucide-react';

type ViewRole = 'admin' | 'director' | 'organizer';

// ─── Screenshot placeholder component ───────────────────────────────────────
// Drop your screenshots into /public/guide/ with the exact filename shown.
// Example: /public/guide/login.png  →  <Screenshot name="login" />
function Screenshot({ name, caption }: { name: string; caption: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgSrc = `/guide/${name}.png`;

  return (
    <figure className="my-4">
      {!error ? (
        <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 shadow-sm">
          <img
            src={imgSrc}
            alt={caption}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            className={`w-full transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
          {!loaded && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-pulse flex flex-col items-center gap-2 py-12">
                <ImageIcon className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                <span className="text-xs text-gray-400 dark:text-gray-500">Loading...</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/30 flex flex-col items-center justify-center py-10 px-4 gap-2">
          <ImageIcon className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          <span className="text-sm font-medium text-gray-400 dark:text-gray-500">{caption}</span>
          <code className="text-xs text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-700/50 px-2 py-0.5 rounded">
            /public/guide/{name}.png
          </code>
        </div>
      )}
      <figcaption className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
        {caption}
      </figcaption>
    </figure>
  );
}

// ─── Collapsible Section Component ──────────────────────────────────────────
function Section({
  id,
  icon: Icon,
  title,
  badge,
  children,
  defaultOpen = false,
}: {
  id: string;
  icon: any;
  title: string;
  badge?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const ref = useRef<HTMLDivElement>(null);

  // Open section if URL hash matches
  useEffect(() => {
    if (window.location.hash === `#${id}`) {
      setOpen(true);
      setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [id]);

  return (
    <div ref={ref} id={id} className="scroll-mt-20">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all group text-left"
      >
        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
          <Icon className="w-5 h-5" />
        </div>
        <span className="flex-1 font-semibold text-gray-900 dark:text-white">{title}</span>
        {badge && (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
            {badge}
          </span>
        )}
        {open ? (
          <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform" />
        )}
      </button>
      {open && (
        <div className="mt-2 px-5 py-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 prose-compact">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Reusable typography helpers ────────────────────────────────────────────
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3 flex items-center gap-2">{children}</h3>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">{children}</p>;
}
function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 mb-4 ml-4 list-disc">{children}</ul>;
}
function Li({ children }: { children: React.ReactNode }) {
  return <li className="leading-relaxed">{children}</li>;
}
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 my-4">
      <Lightbulb className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
      <div className="text-sm text-amber-800 dark:text-amber-300">{children}</div>
    </div>
  );
}
function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 my-4">
      <HelpCircle className="w-5 h-5 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
      <div className="text-sm text-blue-800 dark:text-blue-300">{children}</div>
    </div>
  );
}
function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${colors[color] || colors.gray}`}>{children}</span>;
}
function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 mb-4 ml-1">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3 leading-relaxed">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">
            {i + 1}
          </span>
          <span className="pt-0.5">{step}</span>
        </li>
      ))}
    </ol>
  );
}

// ─── Role permission table ──────────────────────────────────────────────────
function PermissionTable({ highlight }: { highlight: ViewRole }) {
  const rows = [
    { feature: 'Dashboard', organizer: true, director: true, admin: true },
    { feature: 'Invitees & Contacts', organizer: true, director: true, admin: true },
    { feature: 'Approve / Reject', organizer: false, director: true, admin: true },
    { feature: 'Reports', organizer: false, director: true, admin: true },
    { feature: 'Events Management', organizer: false, director: false, admin: true },
    { feature: 'Attendance & Check-in', organizer: false, director: false, admin: true },
    { feature: 'User Management', organizer: false, director: false, admin: true },
    { feature: 'Export Settings', organizer: false, director: false, admin: true },
  ];
  const colHighlight = (role: ViewRole) => highlight === role ? 'bg-indigo-50/60 dark:bg-indigo-900/20' : '';
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-700/50">
            <th className="text-left px-4 py-2.5 font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">Feature</th>
            <th className={`text-center px-4 py-2.5 font-semibold text-blue-700 dark:text-blue-400 border-b border-gray-200 dark:border-gray-600 ${colHighlight('organizer')}`}>Organizer</th>
            <th className={`text-center px-4 py-2.5 font-semibold text-emerald-700 dark:text-emerald-400 border-b border-gray-200 dark:border-gray-600 ${colHighlight('director')}`}>Director</th>
            <th className={`text-center px-4 py-2.5 font-semibold text-purple-700 dark:text-purple-400 border-b border-gray-200 dark:border-gray-600 ${colHighlight('admin')}`}>Admin</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-800/50'}>
              <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700/50">{row.feature}</td>
              <td className={`text-center px-4 py-2.5 border-b border-gray-100 dark:border-gray-700/50 ${colHighlight('organizer')}`}>{row.organizer ? <span className="text-green-500">✓</span> : <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
              <td className={`text-center px-4 py-2.5 border-b border-gray-100 dark:border-gray-700/50 ${colHighlight('director')}`}>{row.director ? <span className="text-green-500">✓</span> : <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
              <td className={`text-center px-4 py-2.5 border-b border-gray-100 dark:border-gray-700/50 ${colHighlight('admin')}`}>{row.admin ? <span className="text-green-500">✓</span> : <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Role switcher tab config ───────────────────────────────────────────────
const ROLE_TABS: { role: ViewRole; label: string; icon: any; color: string; gradient: string }[] = [
  { role: 'organizer', label: 'Organizer', icon: Users,       color: 'blue',    gradient: 'from-blue-600 to-indigo-600' },
  { role: 'director',  label: 'Director',  icon: CheckSquare, color: 'emerald', gradient: 'from-emerald-600 to-teal-600' },
  { role: 'admin',     label: 'Admin',     icon: Shield,      color: 'purple',  gradient: 'from-indigo-600 to-purple-600' },
];

// Helper: does the selected viewRole have access?
function roleHas(viewRole: ViewRole, allowed: ViewRole[]): boolean {
  return allowed.includes(viewRole);
}

// ─── Main Help Page ─────────────────────────────────────────────────────────
export default function Help() {
  const { user } = useAuth();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [viewRole, setViewRole] = useState<ViewRole>((user?.role as ViewRole) || 'organizer');

  const isViewAdmin = viewRole === 'admin';
  const isViewDirector = viewRole === 'director';
  const isViewOrganizer = viewRole === 'organizer';

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinkCls = "px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors";

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">User Guide</h1>
              <p className="text-indigo-200 text-sm mt-0.5">EIMS — Event Invitee Management System</p>
            </div>
          </div>
          <p className="text-indigo-100 text-sm sm:text-base max-w-2xl mt-3 leading-relaxed">
            Welcome! This guide covers every feature in EIMS.
            Switch the role view below to explore what each role can do, or expand any section to learn more.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">
              Logged in as: <strong className="capitalize">{user?.role}</strong>
            </span>
            {user?.inviter_group_name && (
              <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">
                Group: <strong>{user.inviter_group_name}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ROLE SWITCHER                                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">View as Role</h2>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Pick a role to see which pages and features are available. Sections will update below.
        </p>
        <div className="flex flex-wrap gap-2">
          {ROLE_TABS.map(({ role, label, icon: TabIcon, color, gradient }) => {
            const active = viewRole === role;
            const isYou = user?.role === role;
            return (
              <button
                key={role}
                onClick={() => setViewRole(role)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? `bg-gradient-to-r ${gradient} text-white shadow-md`
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                {label}
                {isYou && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                    active ? 'bg-white/25 text-white' : `bg-${color}-100 text-${color}-700 dark:bg-${color}-900/30 dark:text-${color}-400`
                  }`}>
                    You
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Navigation — adapts to viewRole */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Quick Navigation</h2>
        <div className="flex flex-wrap gap-2">
          <a href="#getting-started" className={navLinkCls}>Getting Started</a>
          <a href="#roles" className={navLinkCls}>Roles & Permissions</a>
          <a href="#dashboard" className={navLinkCls}>Dashboard</a>
          <a href="#invitees" className={navLinkCls}>Invitees</a>
          {roleHas(viewRole, ['admin', 'director']) && <a href="#approvals" className={navLinkCls}>Approvals</a>}
          {isViewAdmin && <a href="#events" className={navLinkCls}>Events</a>}
          {isViewAdmin && <a href="#attendance" className={navLinkCls}>Attendance</a>}
          {roleHas(viewRole, ['admin', 'director']) && <a href="#reports" className={navLinkCls}>Reports</a>}
          {isViewAdmin && <a href="#users" className={navLinkCls}>Users</a>}
          {isViewAdmin && <a href="#settings-section" className={navLinkCls}>Settings</a>}
          <a href="#profile" className={navLinkCls}>Profile</a>
          <a href="#public-pages" className={navLinkCls}>Public Pages</a>
          <a href="#tips" className={navLinkCls}>Tips</a>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* GETTING STARTED                                                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Section id="getting-started" icon={Lock} title="Getting Started" defaultOpen>
        <H3><Lock className="w-5 h-5 text-indigo-500" /> Logging In</H3>
        <P>
          Open the app and enter the <strong>username</strong> and <strong>password</strong> provided by your administrator.
        </P>
        <div className="overflow-x-auto my-3">
          <table className="w-full text-sm border-collapse">
            <tbody>
              <tr className="border-b border-gray-100 dark:border-gray-700/50">
                <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300 w-40">Remember me</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">Keeps you logged in across browser sessions. Always on in the mobile app.</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-700/50">
                <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">Show/Hide password</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">Toggle the eye icon to verify what you typed.</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">Session timeout</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">After 30 minutes of inactivity (with "Remember me" off), you'll need to log in again.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Screenshot name="login" caption="Login page — enter your credentials to get started" />

        <H3><Smartphone className="w-5 h-5 text-indigo-500" /> Navigation</H3>
        <P>
          After login, you land on the <strong>Dashboard</strong>. Use the sidebar menu to navigate. On mobile, tap the ☰ icon to open the sidebar. 
          You only see pages relevant to your role.
        </P>
        <Screenshot name="sidebar" caption="Sidebar navigation — tap the menu icon on mobile" />

        <H3><Moon className="w-5 h-5 text-indigo-500" /> Dark Mode</H3>
        <P>
          Toggle between light and dark themes using the sun/moon icon in the header bar. Your preference is saved automatically.
        </P>
        <Screenshot name="dark-mode" caption="Light and dark themes — switch with one click" />
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ROLES & PERMISSIONS                                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Section id="roles" icon={Shield} title="Roles & Permissions">
        <P>
          EIMS has three user roles, each with different access levels. The currently selected role is highlighted below.
        </P>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
          <div className={`p-4 rounded-xl border-2 ${isViewOrganizer ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30"><Users className="w-4 h-4 text-blue-600 dark:text-blue-400" /></div>
              <span className="font-semibold text-gray-900 dark:text-white text-sm">Organizer</span>
              {user?.role === 'organizer' && <Badge color="blue">You</Badge>}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Submit invitees to events and manage your group's contacts.</p>
          </div>
          <div className={`p-4 rounded-xl border-2 ${isViewDirector ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-500' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30"><CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /></div>
              <span className="font-semibold text-gray-900 dark:text-white text-sm">Director</span>
              {user?.role === 'director' && <Badge color="green">You</Badge>}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Approve or reject invitations, view reports, plus all Organizer features.</p>
          </div>
          <div className={`p-4 rounded-xl border-2 ${isViewAdmin ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-500' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30"><Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" /></div>
              <span className="font-semibold text-gray-900 dark:text-white text-sm">Admin</span>
              {user?.role === 'admin' && <Badge color="purple">You</Badge>}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Full system control — events, users, attendance, settings, and everything else.</p>
          </div>
        </div>

        <H3>Permission Matrix</H3>
        <PermissionTable highlight={viewRole} />
        <Screenshot name="roles-sidebar" caption="Each role sees different sidebar menu items" />
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DASHBOARD                                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Section id="dashboard" icon={LayoutDashboard} title="Dashboard">
        <P>
          Your home base. The dashboard adapts to your role and shows the information most relevant to you.
        </P>
        {isViewAdmin && (
          <>
            <H3>Admin Dashboard</H3>
            <Ul>
              <Li><strong>System-wide statistics</strong> — Total events, invitees, approval pipeline, and recent activity.</Li>
              <Li><strong>Quick-action cards</strong> — Jump to pending approvals, upcoming events, or create new ones.</Li>
              <Li><strong>Event overview</strong> — See all events with their status at a glance.</Li>
            </Ul>
            <Screenshot name="dashboard-admin" caption="Admin dashboard — full system overview" />
          </>
        )}
        {isViewDirector && (
          <>
            <H3>Director Dashboard</H3>
            <Ul>
              <Li><strong>Group statistics</strong> — Your group's invitee counts, approval rates.</Li>
              <Li><strong>Pending approvals</strong> — Quick count of invitations waiting for your review.</Li>
              <Li><strong>Recent activity</strong> — Latest submissions from your Organizers.</Li>
            </Ul>
            <Screenshot name="dashboard-director" caption="Director dashboard — approval-focused view" />
          </>
        )}
        {isViewOrganizer && (
          <>
            <H3>Organizer Dashboard</H3>
            <Ul>
              <Li><strong>Submission stats</strong> — How many invitees you've submitted, and their status breakdown.</Li>
              <Li><strong>Quick links</strong> — Jump directly to submit invitees or manage contacts.</Li>
            </Ul>
            <Screenshot name="dashboard-organizer" caption="Organizer dashboard — submission-focused view" />
          </>
        )}
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* INVITEES                                                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Section id="invitees" icon={Users} title="Invitees" badge="All Roles">
        <P>
          The Invitees page is where you manage event invitations and your group's contact list. 
          It has <strong>two tabs</strong>: Events and Contacts.
        </P>

        <H3><Calendar className="w-5 h-5 text-indigo-500" /> Events Tab</H3>
        <P>
          Select an event from the dropdown to see all invitees submitted to it. Each invitee shows a status badge.
        </P>
        <div className="flex flex-wrap gap-2 my-3">
          <Badge color="yellow">Pending</Badge>
          <Badge color="green">Approved</Badge>
          <Badge color="red">Rejected</Badge>
          <Badge color="blue">Resubmitted</Badge>
        </div>

        <P><strong>Key actions:</strong></P>
        <Ul>
          <Li><strong>Submit an invitee</strong> — Pick a contact or enter new details, assign an inviter, choose a category, and submit for approval.</Li>
          <Li><strong>Resubmit rejected invitees</strong> — Add a note explaining why and resubmit for reconsideration.</Li>
          <Li><strong>Search & filter</strong> — Search by name, filter by status or inviter.</Li>
          <Li><strong>Bulk import</strong> — Upload an Excel/CSV file to submit many invitees at once.</Li>
          <Li><strong>Export</strong> — Download as Excel, CSV, PDF, or print directly.</Li>
        </Ul>
        <Screenshot name="invitees-events-tab" caption="Events tab — select an event and manage its invitees" />
        <Screenshot name="invitees-add-modal" caption="Add Invitee — fill in details and submit for approval" />

        <H3><Upload className="w-5 h-5 text-indigo-500" /> Bulk Import</H3>
        <StepList steps={[
          'Click the Import button.',
          'Download the template (.xlsx) — it has all the required columns.',
          'Fill in your contacts in Excel.',
          'Upload the filled file (drag & drop or click to browse).',
          'Click "Import Contacts" — done!',
        ]} />
        <Screenshot name="invitees-import" caption="Bulk import — download template, fill it, and upload" />

        <H3><Users className="w-5 h-5 text-indigo-500" /> Contacts Tab</H3>
        <P>
          Your group's master contact list — people who can be invited to any event.
        </P>
        <Ul>
          <Li><strong>Add / Edit contacts</strong> — Name, phone, email, company, position, category, notes, plus-one count.</Li>
          <Li><strong>Assign an inviter</strong> — Each contact belongs to an inviter within your group.</Li>
          <Li><strong>Search & filter</strong> — By name, inviter, category{isViewAdmin && ', or group'}.</Li>
          <Li><strong>Export</strong> — Excel, CSV, PDF, or print.</Li>
        </Ul>
        <Screenshot name="invitees-contacts-tab" caption="Contacts tab — your group's contact directory" />

        {isViewAdmin && (
          <>
            <H3><Shield className="w-5 h-5 text-purple-500" /> Admin-Only: Admin Bulk Import</H3>
            <P>
              Admins have an additional <strong>Admin Bulk Import</strong> feature that imports contacts across all groups. 
              Each row in the template must include an <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Inviter_Group</code> column. 
              Groups must already exist; new inviters are auto-created.
            </P>
            <Screenshot name="invitees-admin-import" caption="Admin bulk import — application-wide import with group assignment" />
          </>
        )}

        {isViewAdmin && (
          <>
            <H3>Admin-Only: Category Manager</H3>
            <P>
              Admins can create, edit, and delete <strong>categories</strong> (e.g., VIP, Media, Staff) used to classify contacts and invitees.
            </P>
            <Screenshot name="invitees-categories" caption="Category manager — create and manage invitee categories" />
          </>
        )}

        <H3><Gauge className="w-5 h-5 text-indigo-500" /> Quota Indicator</H3>
        <P>
          If your group has a quota for an event, a progress bar shows how many slots are used vs. available. 
          If you've hit the limit, you'll need to contact your Admin.
        </P>
        <Screenshot name="invitees-quota" caption="Quota bar — shows remaining invitee slots for your group" />
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* APPROVALS (Director + Admin)                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {roleHas(viewRole, ['admin', 'director']) && (
        <Section id="approvals" icon={CheckSquare} title="Approvals" badge="Director & Admin">
          <P>
            Review and process invitee submissions. This page has <strong>two tabs</strong>: Pending and Approved.
          </P>

          <H3>Pending Tab</H3>
          <P>All invitations waiting for your approval.</P>
          <Ul>
            <Li><strong>Approve</strong> — Click the checkmark to approve an invitee.</Li>
            <Li><strong>Reject</strong> — Click the X to reject, optionally with a note explaining why.</Li>
            <Li><strong>Bulk actions</strong> — Select multiple invitees, then approve or reject them all at once.</Li>
            <Li><strong>Filter</strong> — By event, inviter, group, or search by name.</Li>
            <Li><strong>Sort</strong> — Click any column header to sort ascending/descending.</Li>
          </Ul>
          <Screenshot name="approvals-pending" caption="Pending approvals — review and take action" />
          <Screenshot name="approvals-reject" caption="Reject with an optional note for the Organizer" />

          <H3>Approved Tab</H3>
          <P>A complete list of all approved invitees across events.</P>
          <Ul>
            <Li>Search, filter, and sort.</Li>
            <Li>Export as Excel, CSV, PDF, or Print.</Li>
          </Ul>
          <Screenshot name="approvals-approved" caption="Approved tab — all approved invitees at a glance" />

          <Tip>
            Review pending approvals regularly — Organizers are waiting on your decision!
          </Tip>
        </Section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* EVENTS (Admin only)                                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isViewAdmin && (
        <Section id="events" icon={Calendar} title="Events Management" badge="Admin Only">
          <P>
            Create, edit, and manage all events. Events are displayed as cards showing name, dates, venue, status, invitee count, and assigned groups.
          </P>
          <Screenshot name="events-grid" caption="Events page — all events displayed as cards" />

          <H3>Event Statuses</H3>
          <div className="flex flex-wrap gap-2 my-3">
            <Badge color="blue">Upcoming</Badge>
            <Badge color="green">Ongoing</Badge>
            <Badge color="gray">Ended</Badge>
            <Badge color="yellow">On Hold</Badge>
            <Badge color="red">Cancelled</Badge>
          </div>
          <P>
            Statuses update automatically based on dates, but you can also change them manually.
          </P>

          <H3>Creating an Event</H3>
          <P>Click <strong>"+ Create Event"</strong> and fill in:</P>
          <div className="overflow-x-auto my-3">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">Field</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 w-20">Required</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">Description</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 dark:text-gray-400">
                <tr><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 font-medium">Event Name</td><td className="text-center px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 text-green-500">✓</td><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">The event title</td></tr>
                <tr><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 font-medium">Start Date & Time</td><td className="text-center px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 text-green-500">✓</td><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">When the event begins</td></tr>
                <tr><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 font-medium">End Date & Time</td><td className="text-center px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 text-green-500">✓</td><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">When the event ends</td></tr>
                <tr><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 font-medium">Venue</td><td className="text-center px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 text-gray-400">—</td><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">Location name</td></tr>
                <tr><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 font-medium">Description</td><td className="text-center px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 text-gray-400">—</td><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">Additional details</td></tr>
                <tr><td className="px-3 py-2 font-medium">Inviter Groups</td><td className="text-center px-3 py-2 text-green-500">✓</td><td className="px-3 py-2">Select "All Groups" or pick specific groups</td></tr>
              </tbody>
            </table>
          </div>
          <Screenshot name="events-create" caption="Create Event — fill in details and assign inviter groups" />

          <H3>Event Quick Actions</H3>
          <P>Each event card has these action buttons:</P>
          <div className="overflow-x-auto my-3">
            <table className="w-full text-sm border-collapse">
              <tbody className="text-gray-600 dark:text-gray-400">
                <tr className="border-b border-gray-100 dark:border-gray-700/50"><td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300 w-40">✏️ Edit</td><td className="px-3 py-2">Modify event details (name, dates, venue, groups)</td></tr>
                <tr className="border-b border-gray-100 dark:border-gray-700/50"><td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">⚖️ Quotas</td><td className="px-3 py-2">Set maximum invitees per group</td></tr>
                <tr className="border-b border-gray-100 dark:border-gray-700/50"><td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">🔑 Check-in Settings</td><td className="px-3 py-2">Generate PIN, get console & dashboard URLs</td></tr>
                <tr className="border-b border-gray-100 dark:border-gray-700/50"><td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">🕐 Change Status</td><td className="px-3 py-2">Manually override event status</td></tr>
                <tr><td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">🗑️ Delete</td><td className="px-3 py-2">Remove event and all related data permanently</td></tr>
              </tbody>
            </table>
          </div>

          <H3><Key className="w-5 h-5 text-amber-500" /> Check-in PIN & Links</H3>
          <P>For each event, you can generate a <strong>Check-in PIN</strong> which creates:</P>
          <Ul>
            <Li><strong>Event Code</strong> — A unique code identifying the event.</Li>
            <Li><strong>PIN</strong> — A numeric PIN for the check-in operator at the door.</Li>
            <Li><strong>Check-in Console URL</strong> — Share with the person operating check-in.</Li>
            <Li><strong>Live Dashboard URL</strong> — A public, real-time stats page (great for projecting at the venue).</Li>
          </Ul>
          <P>You can also activate/deactivate the PIN, set auto-deactivation (e.g., 24 hours after the event ends), and regenerate if needed.</P>
          <Screenshot name="events-pin" caption="Check-in settings — PIN, event code, and shareable URLs" />

          <H3><Gauge className="w-5 h-5 text-purple-500" /> Group Quotas</H3>
          <P>
            Set the maximum number of invitees each group can submit for an event. Leave blank for unlimited. 
            A progress bar shows usage, and over-quota groups are highlighted in red.
          </P>
          <Screenshot name="events-quotas" caption="Quota management — set and monitor limits per group" />
        </Section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ATTENDANCE (Admin only)                                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isViewAdmin && (
        <Section id="attendance" icon={UserCheck} title="Attendance" badge="Admin Only">
          <P>
            Track the full lifecycle: invitation sent → confirmation received → checked in at the door.
          </P>

          <H3>Key Features</H3>
          <Ul>
            <Li><strong>Select an event</strong> to see attendance statistics and the invitee list.</Li>
            <Li><strong>Send invitation codes</strong> — Generate unique QR/invitation codes and send via Email or SMS.</Li>
            <Li><strong>Track confirmations</strong> — See who confirmed, declined, or hasn't responded.</Li>
            <Li><strong>Check in guests</strong> — Mark attendees as arrived, or undo a check-in.</Li>
            <Li><strong>Reset confirmations</strong> — Reset a guest's response to "pending".</Li>
            <Li><strong>Search & filter</strong> — By name, confirmation status, check-in status.</Li>
            <Li><strong>Export</strong> — Excel, CSV, PDF, or Print.</Li>
          </Ul>
          <Screenshot name="attendance-overview" caption="Attendance page — stats cards and invitee table" />
          <Screenshot name="attendance-send" caption="Send invitation codes via email or SMS" />

          <H3>Check-in PIN Controls</H3>
          <P>
            The check-in PIN status bar at the top lets you quickly see if the PIN is active, toggle it on/off, 
            and copy the console URL — all without leaving the Attendance page.
          </P>
          <Screenshot name="attendance-pin-bar" caption="Quick PIN controls at the top of the Attendance page" />
        </Section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* REPORTS (Director + Admin)                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {roleHas(viewRole, ['admin', 'director']) && (
        <Section id="reports" icon={FileText} title="Reports" badge="Director & Admin">
          <P>
            Generate, view, and export detailed reports. Click a report type card to load it, apply filters, then export.
          </P>

          <H3>Available Reports</H3>
          <div className="overflow-x-auto my-3">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">Report</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">Description</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 w-24">Access</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 dark:text-gray-400">
                <tr className="border-b border-gray-100 dark:border-gray-700/50"><td className="px-3 py-2 font-medium">Invitees by Group</td><td className="px-3 py-2">Summary counts per inviter group per event</td><td className="text-center px-3 py-2"><Badge color="green">All</Badge></td></tr>
                <tr className="border-b border-gray-100 dark:border-gray-700/50"><td className="px-3 py-2 font-medium">Invitees by Inviter</td><td className="px-3 py-2">Summary counts per inviter per event</td><td className="text-center px-3 py-2"><Badge color="green">All</Badge></td></tr>
                <tr className="border-b border-gray-100 dark:border-gray-700/50"><td className="px-3 py-2 font-medium">Detailed Invitees</td><td className="px-3 py-2">Full invitee list with name, status, inviter, group</td><td className="text-center px-3 py-2"><Badge color="green">All</Badge></td></tr>
                <tr className="border-b border-gray-100 dark:border-gray-700/50"><td className="px-3 py-2 font-medium">Full Approved Details</td><td className="px-3 py-2">Approved invitees with attendance info (code sent, confirmed, checked in)</td><td className="text-center px-3 py-2"><Badge color="green">All</Badge></td></tr>
                <tr className="border-b border-gray-100 dark:border-gray-700/50"><td className="px-3 py-2 font-medium">Activity Log</td><td className="px-3 py-2">All system actions — who did what, when</td><td className="text-center px-3 py-2"><Badge color="purple">Admin</Badge></td></tr>
                <tr><td className="px-3 py-2 font-medium">Historical Data</td><td className="px-3 py-2">Archived invitee data from previous imports</td><td className="text-center px-3 py-2"><Badge color="purple">Admin</Badge></td></tr>
              </tbody>
            </table>
          </div>

          <H3><Download className="w-5 h-5 text-indigo-500" /> Export Formats</H3>
          <P>
            Every report can be exported in multiple formats:
          </P>
          <div className="flex flex-wrap gap-2 my-3">
            <Badge color="green">Excel (.xlsx)</Badge>
            <Badge color="blue">CSV</Badge>
            <Badge color="red">PDF</Badge>
            <Badge color="gray">Print</Badge>
          </div>
          <Screenshot name="reports-overview" caption="Reports page — select a report type, apply filters, and export" />
          <Screenshot name="reports-export" caption="Export options — Excel, CSV, PDF, or Print" />

          {isViewDirector && (
            <InfoBox>
              As a Director, reports are automatically filtered to your group's data.
            </InfoBox>
          )}
        </Section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* USERS (Admin only)                                                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isViewAdmin && (
        <Section id="users" icon={UserCog} title="User Management" badge="Admin Only">
          <P>
            Create and manage all user accounts in the system.
          </P>
          <Ul>
            <Li><strong>Create users</strong> — Set username, email, full name, password, role, and inviter group.</Li>
            <Li><strong>Edit users</strong> — Update any field, reset passwords.</Li>
            <Li><strong>Activate / Deactivate</strong> — Disable a user without deleting them.</Li>
            <Li><strong>Delete users</strong> — Permanently remove accounts.</Li>
            <Li><strong>Filter by role</strong> — Quickly find Admins, Directors, or Organizers.</Li>
          </Ul>
          <Screenshot name="users-list" caption="Users page — manage all system accounts" />
          <Screenshot name="users-create" caption="Create / edit user — assign role and group" />
        </Section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SETTINGS (Admin only)                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isViewAdmin && (
        <Section id="settings-section" icon={Settings} title="Export Settings" badge="Admin Only">
          <P>
            Configure how exported reports look — brand them with your logo and colors.
          </P>
          <Ul>
            <Li><strong>Upload a logo</strong> — Appears on PDF and Excel exports.</Li>
            <Li><strong>Set brand colors</strong> — Customize the accent color on export headers.</Li>
            <Li><strong>Preview</strong> — See how your exports will look before generating them.</Li>
          </Ul>
          <Screenshot name="settings-export" caption="Export settings — brand your reports with logo and colors" />
        </Section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PROFILE                                                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Section id="profile" icon={UserCog} title="Profile & Password">
        <P>
          Access your profile by clicking your name in the sidebar or navigating to the Profile page.
        </P>
        <Ul>
          <Li><strong>View account details</strong> — Name, email, role, group, and creation date.</Li>
          <Li><strong>Change password</strong> — Must meet requirements: 8+ characters, uppercase, lowercase, and a number.</Li>
        </Ul>
        <Screenshot name="profile" caption="Your profile and password management" />
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PUBLIC PAGES                                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Section id="public-pages" icon={Globe} title="Public Pages (No Login Required)">
        <P>
          These pages can be accessed by anyone with the link — no account needed.
        </P>

        <H3><QrCode className="w-5 h-5 text-indigo-500" /> Attendance Confirmation Portal</H3>
        <P>
          Guests use this page to confirm their attendance. They enter their unique <strong>invitation code</strong>, see their event details, and tap Confirm or Decline.
        </P>
        <P><strong>URL:</strong> <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">/portal</code></P>
        <Screenshot name="portal-code" caption="Portal — guest enters their invitation code" />
        <Screenshot name="portal-confirm" caption="Portal — guest sees event details and confirms" />

        <H3><Search className="w-5 h-5 text-indigo-500" /> Check-in Console</H3>
        <P>
          The check-in operator at the door uses this to check in guests:
        </P>
        <StepList steps={[
          'Open the console URL (provided by the Admin).',
          'Enter the event PIN.',
          'Search for a guest by name or scan their QR code.',
          'Tap "Check In" — guest is marked as arrived.',
        ]} />
        <P><strong>URL:</strong> <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">/checkin/{'<event-code>'}</code></P>
        <Screenshot name="checkin-pin" caption="Check-in Console — enter the event PIN" />
        <Screenshot name="checkin-console" caption="Check-in Console — search and check in guests" />

        <H3><BarChart3 className="w-5 h-5 text-indigo-500" /> Live Dashboard</H3>
        <P>
          A real-time public dashboard showing total invitees, confirmed, and checked in — 
          with live counters and progress bars. Perfect for projecting on a screen at the venue.
        </P>
        <P><strong>URL:</strong> <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">/live/{'<event-code>'}</code></P>
        <Screenshot name="live-dashboard" caption="Live Dashboard — real-time event stats for big screens" />
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TIPS & BEST PRACTICES                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Section id="tips" icon={Lightbulb} title="Tips & Best Practices">
        {roleHas(viewRole, ['organizer', 'admin']) && (
          <>
            <H3><Users className="w-5 h-5 text-blue-500" /> For Organizers</H3>
            <Ul>
              <Li>Use <strong>bulk import</strong> for large guest lists — download the template, fill in Excel, and upload.</Li>
              <Li>Add <strong>notes when resubmitting</strong> a rejected invitee — it helps the Director understand why.</Li>
              <Li>Keep contacts updated in the <strong>Contacts tab</strong> — they carry over to future events.</Li>
              <Li>Watch the <strong>quota bar</strong> — submit early before your group's slots run out.</Li>
            </Ul>
          </>
        )}
        {roleHas(viewRole, ['director', 'admin']) && (
          <>
            <H3><CheckSquare className="w-5 h-5 text-emerald-500" /> For Directors</H3>
            <Ul>
              <Li>Review pending approvals <strong>regularly</strong> — Organizers are waiting on your decision.</Li>
              <Li>Use <strong>bulk approve</strong> for large batches — select all, then approve at once.</Li>
              <Li><strong>Export reports</strong> before the event to share with stakeholders.</Li>
            </Ul>
          </>
        )}
        {isViewAdmin && (
          <>
            <H3><Shield className="w-5 h-5 text-purple-500" /> For Admins</H3>
            <Ul>
              <Li>Set <strong>group quotas</strong> before Organizers start submitting — it prevents over-submission.</Li>
              <Li>Generate the <strong>check-in PIN</strong> well before the event — share the console URL with the door team.</Li>
              <Li>Monitor the <strong>Activity Log</strong> to track who did what and when.</Li>
              <Li>Upload your <strong>logo in Settings</strong> — it makes exported reports look professional.</Li>
            </Ul>
          </>
        )}
        <H3><Lightbulb className="w-5 h-5 text-amber-500" /> For Everyone</H3>
        <Ul>
          <Li>Use <strong>dark mode</strong> for low-light environments — toggle via the sun/moon icon in the header.</Li>
          <Li>Use the <strong>search bar</strong> — it's on every page and searches across all visible columns.</Li>
          <Li>On <strong>mobile</strong>, swipe tables horizontally to see all columns.</Li>
          <Li>The app works as a <strong>native Android app</strong> — ask your Admin for the download link.</Li>
        </Ul>
      </Section>

      {/* Scroll-to-top button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all z-30"
          title="Back to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Footer */}
      <div className="text-center py-6 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <strong>Need help?</strong> Contact your system administrator.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          EIMS v2.0 — Event Invitee Management System
        </p>
      </div>
    </div>
  );
}
