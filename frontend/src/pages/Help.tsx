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
    { feature: 'Approvals (view)', organizer: false, director: true, admin: true },
    { feature: 'Approve / Reject actions', organizer: false, director: true, admin: false },
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
          Open the app in your browser. You will see the login page with the EIMS branding on the left side
          and the login form on the right.
        </P>
        <StepList steps={[
          'Enter your Username in the first field.',
          'Enter your Password in the second field.',
          'Optionally check "Remember me" to stay logged in across browser sessions.',
          'Click the "Sign in" button (or press Enter).',
          'You will be redirected to the Dashboard.',
        ]} />
        <P>
          The left panel of the login page displays the EIMS logo and three feature highlights:
          <strong> Smart Invitee Management</strong>, <strong>Real-time Approval Workflow</strong>,
          and <strong>Live Event Check-in</strong>. This panel is hidden on mobile screens.
        </P>
        <div className="overflow-x-auto my-3">
          <table className="w-full text-sm border-collapse">
            <tbody>
              <tr className="border-b border-gray-100 dark:border-gray-700/50">
                <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300 w-44">Show/Hide password</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">Click the eye icon (👁) inside the password field to toggle visibility so you can verify what you typed.</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-700/50">
                <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">Remember me</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">When checked, your session persists even after closing the browser. If unchecked, you will be logged out after inactivity.</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">Already logged in?</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">If you are already authenticated, visiting the login page automatically redirects you to the Dashboard.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Screenshot name="login" caption="Login page — enter your username, password, and click Sign in" />
        <Tip>If you see "Invalid credentials", double-check your username and password. Contact your administrator if you forgot your password.</Tip>

        <H3><Smartphone className="w-5 h-5 text-indigo-500" /> Sidebar Navigation</H3>
        <P>
          After login you land on the <strong>Dashboard</strong>. The left sidebar is your main navigation.
          It shows only the menu items available to your role:
        </P>
        <div className="overflow-x-auto my-3">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">Menu Item</th>
                <th className="text-center px-3 py-2 font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">Organizer</th>
                <th className="text-center px-3 py-2 font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">Director</th>
                <th className="text-center px-3 py-2 font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">Admin</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 dark:text-gray-400">
              <tr className="border-b border-gray-100 dark:border-gray-700/50"><td className="px-3 py-2 font-medium">Dashboard</td><td className="text-center">✓</td><td className="text-center">✓</td><td className="text-center">✓</td></tr>
              <tr className="border-b border-gray-100 dark:border-gray-700/50"><td className="px-3 py-2 font-medium">Events</td><td className="text-center text-gray-300 dark:text-gray-600">—</td><td className="text-center text-gray-300 dark:text-gray-600">—</td><td className="text-center">✓</td></tr>
              <tr className="border-b border-gray-100 dark:border-gray-700/50"><td className="px-3 py-2 font-medium">Invitees</td><td className="text-center">✓</td><td className="text-center">✓</td><td className="text-center">✓</td></tr>
              <tr className="border-b border-gray-100 dark:border-gray-700/50"><td className="px-3 py-2 font-medium">Approvals</td><td className="text-center text-gray-300 dark:text-gray-600">—</td><td className="text-center">✓</td><td className="text-center">✓</td></tr>
              <tr className="border-b border-gray-100 dark:border-gray-700/50"><td className="px-3 py-2 font-medium">Attendance</td><td className="text-center text-gray-300 dark:text-gray-600">—</td><td className="text-center text-gray-300 dark:text-gray-600">—</td><td className="text-center">✓</td></tr>
              <tr className="border-b border-gray-100 dark:border-gray-700/50"><td className="px-3 py-2 font-medium">Reports</td><td className="text-center text-gray-300 dark:text-gray-600">—</td><td className="text-center">✓</td><td className="text-center">✓</td></tr>
              <tr className="border-b border-gray-100 dark:border-gray-700/50"><td className="px-3 py-2 font-medium">Users</td><td className="text-center text-gray-300 dark:text-gray-600">—</td><td className="text-center text-gray-300 dark:text-gray-600">—</td><td className="text-center">✓</td></tr>
              <tr className="border-b border-gray-100 dark:border-gray-700/50"><td className="px-3 py-2 font-medium">Settings</td><td className="text-center text-gray-300 dark:text-gray-600">—</td><td className="text-center text-gray-300 dark:text-gray-600">—</td><td className="text-center">✓</td></tr>
              <tr><td className="px-3 py-2 font-medium">Help / Guide</td><td className="text-center">✓</td><td className="text-center">✓</td><td className="text-center">✓</td></tr>
            </tbody>
          </table>
        </div>
        <P>
          On <strong>mobile devices</strong>, the sidebar is hidden by default. Tap the <strong>☰ hamburger icon</strong> in the top-left corner of the header to open it. Tap any menu item or tap outside the sidebar to close it.
        </P>
        <Screenshot name="sidebar" caption="Sidebar navigation — visible on desktop, tap ☰ on mobile" />

        <H3><Moon className="w-5 h-5 text-indigo-500" /> Dark Mode</H3>
        <P>
          Click the <strong>sun/moon icon</strong> in the top-right area of the header bar to toggle between light and dark themes. Your preference is saved automatically and persists across sessions.
        </P>
        <Screenshot name="dark-mode" caption="Toggle between light and dark themes using the header icon" />

        <H3>Header Bar</H3>
        <P>
          The header bar at the top of every page contains:
        </P>
        <Ul>
          <Li><strong>☰ Menu button</strong> (mobile only) — Opens the sidebar.</Li>
          <Li><strong>App title</strong> — "EIMS" branding.</Li>
          <Li><strong>Theme toggle</strong> — Sun/moon icon to switch light/dark mode.</Li>
          <Li><strong>User dropdown</strong> — Shows your name and role. Click to access <strong>Profile</strong> or <strong>Logout</strong>.</Li>
        </Ul>
        <Screenshot name="header-bar" caption="Header bar with menu toggle, theme switch, and user dropdown" />
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ROLES & PERMISSIONS                                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Section id="roles" icon={Shield} title="Roles & Permissions">
        <P>
          EIMS has three user roles. Each role inherits all features of roles below it and adds more.
          The currently selected role is highlighted below.
        </P>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
          <div className={`p-4 rounded-xl border-2 ${isViewOrganizer ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30"><Users className="w-4 h-4 text-blue-600 dark:text-blue-400" /></div>
              <span className="font-semibold text-gray-900 dark:text-white text-sm">Organizer</span>
              {user?.role === 'organizer' && <Badge color="blue">You</Badge>}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Add invitees to events and track submission status. Manage your group's contact list. Import/export contacts.</p>
          </div>
          <div className={`p-4 rounded-xl border-2 ${isViewDirector ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-500' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30"><CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /></div>
              <span className="font-semibold text-gray-900 dark:text-white text-sm">Director</span>
              {user?.role === 'director' && <Badge color="green">You</Badge>}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Approve/reject invitations, cancel approvals, view reports. Plus all Organizer capabilities.</p>
          </div>
          <div className={`p-4 rounded-xl border-2 ${isViewAdmin ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-500' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30"><Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" /></div>
              <span className="font-semibold text-gray-900 dark:text-white text-sm">Admin</span>
              {user?.role === 'admin' && <Badge color="purple">You</Badge>}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Full system access: events, users, groups, inviters, attendance, check-in, settings, activity logs, and all data management.</p>
          </div>
        </div>

        <H3>Permission Matrix</H3>
        <PermissionTable highlight={viewRole} />

        <InfoBox>
          If you try to access a page you don't have permission for, you'll see an "Access Denied" message showing your current role and a "Go Back" button.
        </InfoBox>
        <Screenshot name="roles-sidebar" caption="Each role sees different sidebar menu items" />
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DASHBOARD                                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Section id="dashboard" icon={LayoutDashboard} title="Dashboard">
        <P>
          The Dashboard is your home page after login. It adapts completely based on your role, showing different
          statistics, cards, and quick actions.
        </P>

        {isViewAdmin && (
          <>
            <H3>Admin Dashboard</H3>
            <P>The Admin dashboard provides a system-wide overview with these sections:</P>
            <Ul>
              <Li><strong>Welcome header</strong> — Personalized greeting with your name, a subtitle "Here's your system overview", and the current date/time.</Li>
              <Li><strong>Metric cards (top row)</strong> — Four colored cards showing: <Badge color="blue">Total Events</Badge>, <Badge color="green">Total Invitees</Badge>, <Badge color="yellow">Pending Approvals</Badge>, and <Badge color="purple">Approved</Badge>. Clicking "Pending Approvals" navigates to the Approvals page.</Li>
              <Li><strong>Quick Actions</strong> — Three action cards: "Create Event" (links to Events page), "Review Approvals" (links to Approvals page), and "Generate Reports" (links to Reports page).</Li>
              <Li><strong>Active Events</strong> — A list of all active/upcoming events with name, date, venue, and status badge. Click "View All Events" to go to the Events page. Clicking any event card opens a modal with detailed event info including invitee counts.</Li>
              <Li><strong>Recent Activity</strong> — The latest system actions (approvals, submissions, etc.) with timestamps.</Li>
            </Ul>
            <Screenshot name="dashboard-admin" caption="Admin dashboard — system-wide statistics and quick actions" />
            <Screenshot name="dashboard-admin-events" caption="Admin dashboard — active events list and event detail modal" />
          </>
        )}

        {isViewDirector && (
          <>
            <H3>Director Dashboard</H3>
            <P>The Director dashboard is focused on your group's approval workflow:</P>
            <Ul>
              <Li><strong>Welcome header</strong> — Greeting with your name and group name, plus current date/time.</Li>
              <Li><strong>Metric cards</strong> — Four cards: <Badge color="blue">Your Group's Invitees</Badge>, <Badge color="yellow">Pending Review</Badge> (clickable — goes to Approvals), <Badge color="green">Approved</Badge>, and <Badge color="red">Rejected</Badge>.</Li>
              <Li><strong>Quick Actions</strong> — "Review Approvals" and "View Reports" action cards.</Li>
              <Li><strong>Assigned Events</strong> — Events assigned to your group with invitee count and status. Click any event card to see details in a modal.</Li>
              <Li><strong>Recent Approval Activity</strong> — Latest approval/rejection actions in your group.</Li>
              <Li><strong>Recent Submissions</strong> — Latest invitee submissions from your group's organizers.</Li>
            </Ul>
            <Screenshot name="dashboard-director" caption="Director dashboard — group statistics and pending approvals" />
          </>
        )}

        {isViewOrganizer && (
          <>
            <H3>Organizer Dashboard</H3>
            <P>The Organizer dashboard focuses on your submission activity:</P>
            <Ul>
              <Li><strong>Welcome header</strong> — Greeting with your name and group name, plus current date/time.</Li>
              <Li><strong>Metric cards</strong> — Four cards: <Badge color="blue">Your Submissions</Badge>, <Badge color="yellow">Pending</Badge>, <Badge color="green">Approved</Badge>, and <Badge color="red">Rejected</Badge>.</Li>
              <Li><strong>Quick Actions</strong> — "Submit Invitees" (links to Invitees page) and "Manage Contacts" (links to Invitees Contacts tab).</Li>
              <Li><strong>Assigned Events</strong> — Events your group is assigned to, showing invitee counts and the event status badge. Click any event card to see details.</Li>
              <Li><strong>Recent Submissions</strong> — Your latest invitee submissions with their current status (pending, approved, rejected).</Li>
            </Ul>
            <Screenshot name="dashboard-organizer" caption="Organizer dashboard — your submissions and assigned events" />
          </>
        )}

        <Tip>Click on any metric card or event card to navigate directly to the relevant page or see more details.</Tip>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* INVITEES                                                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Section id="invitees" icon={Users} title="Invitees" badge="All Roles">
        <P>
          The Invitees page is where you manage event invitations and your group's contact list.
          It has <strong>two tabs</strong> at the top: <Badge color="indigo">Events</Badge> and <Badge color="indigo">Contacts</Badge>.
        </P>

        {/* ── EVENTS TAB ── */}
        <H3><Calendar className="w-5 h-5 text-indigo-500" /> Events Tab</H3>
        <P>
          This tab lets you select an event, see your group's contacts, and submit them for approval.
          {isViewAdmin && <> <strong>Note:</strong> Admins can view this tab but cannot submit contacts — only Organizers and Directors can submit.</>}
        </P>

        <P><strong>Step 1: Select an Event</strong></P>
        <P>
          At the top, assigned events are displayed as <strong>clickable cards</strong> in a grid.
          Each card shows the event name, status, start date, and venue.
          Only active events (Upcoming or Ongoing) assigned to your inviter group appear.
          Click a card to select it.
        </P>
        <Screenshot name="invitees-event-select" caption="Select an event card to work with" />

        <P><strong>Event Info Header</strong></P>
        <P>
          After selecting an event, an info header shows the event name, date, venue, and assigned groups
          (click the groups badge to see all assigned groups in a popup).
          Three stat counters show <strong>Pending</strong>, <strong>Approved</strong>, and <strong>Rejected</strong> counts.
          Clicking "Pending" or "Approved" navigates to the Approvals page (Directors/Admins only).
          Clicking "Rejected" filters the contact list below to show only rejected contacts.
        </P>
        <Screenshot name="invitees-event-header" caption="Event info header with stats — pending, approved, rejected counts" />

        {!isViewAdmin && (
          <>
            <P><strong>Quota Bar</strong> (Organizers & Directors)</P>
            <P>
              If your group has a quota for the selected event, a progress bar appears showing
              how many slots you have used vs. available (e.g., "Group Quota: 12 / 50"). The bar changes color:
              indigo when within limit, amber when close to the limit (≤5 remaining), and red when the quota is reached.
              When quota is reached, the "Submit for Approval" button is disabled.
            </P>
            <Screenshot name="invitees-quota" caption="Quota progress bar — shows used vs. available slots" />
          </>
        )}

        <P><strong>Step 2: Submit Contacts for Approval</strong></P>
        <P>
          Below the event info, you see a table of your group's contacts that are available to submit
          (contacts already approved or pending for this event are excluded). To submit:
        </P>
        <StepList steps={[
          'Use checkboxes to select one or more contacts from the table.',
          'Alternatively, use the top checkbox to select/deselect all visible contacts.',
          'Click "Submit for Approval" at the bottom of the section.',
          'A success toast confirms how many contacts were submitted.',
          'The submitted contacts move to "Pending" status and disappear from the available list.',
        ]} />
        {!isViewAdmin && (
          <P>
            You can also click the <strong>"Submit"</strong> link on an individual contact row to submit just that one contact instantly.
          </P>
        )}
        {isViewAdmin && (
          <InfoBox>
            Admins cannot submit contacts for approval. This tab shows a message: "Admins cannot submit contacts - assign organizers to do this."
            Admins can still view the event data and contacts.
          </InfoBox>
        )}
        <Screenshot name="invitees-submit" caption="Select contacts and submit for approval" />

        <P><strong>Rejected Contacts</strong></P>
        <P>
          When viewing the contact list, rejected contacts appear with a <strong>red ✗ icon</strong> next to their name.
          Click the red ✗ icon to open a <strong>"Rejection Details"</strong> modal showing:
        </P>
        <Ul>
          <Li><strong>Invitee name</strong></Li>
          <Li><strong>Rejected by</strong> — The director/admin who rejected</Li>
          <Li><strong>Rejection note</strong> — The reason provided for the rejection</Li>
        </Ul>
        <P>
          To resubmit a rejected contact, click the <strong>"Rejected"</strong> stat counter in the event header
          to filter to rejected contacts. Then select them with checkboxes and click "Submit for Approval" again.
        </P>
        <Screenshot name="invitees-rejection-details" caption="Rejection Details modal — see who rejected and why" />

        <P><strong>Events Tab Filters</strong></P>
        <Ul>
          <Li><strong>Search bar</strong> — Type to search by name, email, phone, or company.</Li>
          <Li><strong>Inviter filter</strong> — Dropdown to filter by specific inviter.</Li>
          <Li><strong>Category filter</strong> — Dropdown to filter by category.</Li>
          <Li><strong>Sort</strong> — Click any column header to sort ascending/descending.</Li>
        </Ul>
        <Screenshot name="invitees-filters" caption="Search, inviter, and category filters on the Events tab" />

        {/* ── CONTACTS TAB ── */}
        <H3><Users className="w-5 h-5 text-indigo-500" /> Contacts Tab</H3>
        <P>
          The Contacts tab is your group's <strong>master contact directory</strong>. These are the people
          who can be invited to any event. Contacts persist across events — add them once, use them many times.
        </P>
        <Screenshot name="invitees-contacts-tab" caption="Contacts tab — your group's reusable contact directory" />

        <P><strong>Add a New Contact</strong>{!isViewAdmin && ' (Organizers & Directors)'}</P>
        <P>
          {isViewAdmin
            ? <>Admins do not see the "Add Contact" button. Only Organizers and Directors can add contacts to their group.</>
            : <>Click <strong>"+ Add Contact"</strong> to open the contact form modal with these fields:</>
          }
        </P>
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
              <tr><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 font-medium">Inviter</td><td className="text-center px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 text-green-500">✓</td><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">Select the inviter this contact belongs to</td></tr>
              <tr><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 font-medium">Full Name</td><td className="text-center px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 text-green-500">✓</td><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">Contact's full name</td></tr>
              <tr><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 font-medium">Email</td><td className="text-center px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 text-green-500">✓</td><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">Email address (must be a valid format)</td></tr>
              <tr><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 font-medium">Phone</td><td className="text-center px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 text-green-500">✓</td><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">Primary phone number (must start with 20, 12 digits, e.g. 201012345678)</td></tr>
              <tr><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 font-medium">Secondary Phone</td><td className="text-center px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 text-gray-400">—</td><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">Alternative phone number</td></tr>
              <tr><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 font-medium">Category</td><td className="text-center px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 text-gray-400">—</td><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">Classification (VIP, Media, etc.)</td></tr>
              <tr><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 font-medium">Guests Allowed</td><td className="text-center px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 text-gray-400">—</td><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">Number of plus-ones (default 0)</td></tr>
              <tr><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 font-medium">Company</td><td className="text-center px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 text-gray-400">—</td><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">Company/organization name</td></tr>
              <tr><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 font-medium">Position</td><td className="text-center px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 text-gray-400">—</td><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">Job title/position</td></tr>
              <tr><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 font-medium">Title</td><td className="text-center px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 text-gray-400">—</td><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">Honorific (Mr., Mrs., Dr., etc.)</td></tr>
              <tr><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 font-medium">Address</td><td className="text-center px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 text-gray-400">—</td><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">Physical address</td></tr>
              <tr><td className="px-3 py-2 font-medium">Notes</td><td className="text-center px-3 py-2 text-gray-400">—</td><td className="px-3 py-2">Any additional notes about this contact</td></tr>
            </tbody>
          </table>
        </div>
        <Screenshot name="invitees-add-contact" caption="Add Contact modal — fill in contact details" />

        <P><strong>Edit a Contact</strong></P>
        <P>
          Click the <strong>pencil icon</strong> on any contact row to open the edit modal.
          The same form as "Add Contact" appears, pre-filled with the contact's current data.
          Make changes and click "Save".
        </P>

        <P><strong>Delete a Contact</strong></P>
        <P>
          {isViewAdmin
            ? <>Click the <strong>trash icon</strong> on a contact row. A confirmation dialog asks "Are you sure?". Click "Delete" to permanently remove the contact.</>
            : <>Only Admins can delete contacts. If you need a contact removed, ask your administrator.</>
          }
        </P>

        <P><strong>View Event History</strong></P>
        <P>
          Click the <strong>history/clock icon</strong> on a contact row to see which events this contact
          has been submitted to and their approval status in each.
        </P>
        <Screenshot name="invitees-contact-history" caption="Contact event history — see all events this contact was submitted to" />

        <P><strong>Contacts Table Columns</strong></P>
        <Ul>
          <Li><strong>Name</strong> — Full name of the contact.</Li>
          <Li><strong>Inviter</strong> — The inviter this contact belongs to.</Li>
          <Li><strong>Category</strong> — Classification tag.</Li>
          <Li><strong>Guests</strong> — Number of plus-ones allowed.</Li>
          <Li><strong>Position</strong> — Job title.</Li>
          <Li><strong>Company</strong> — Organization.</Li>
          <Li><strong>Events</strong> — Three colored count badges showing: <span className="text-green-600">approved</span>, <span className="text-yellow-600">pending</span>, and <span className="text-red-600">rejected</span> event counts.</Li>
          <Li><strong>Actions</strong> — History, Edit, Delete buttons.</Li>
        </Ul>

        <P><strong>Contacts Filters & Search</strong></P>
        <Ul>
          <Li><strong>Search bar</strong> — Search by name, phone, email, company (filters with a debounce delay).</Li>
          <Li><strong>Inviter filter</strong> — Filter contacts by their inviter.</Li>
          <Li><strong>Category filter</strong> — Filter by category.</Li>
          {isViewAdmin && <Li><strong>Group filter</strong> (Admin only) — Filter by inviter group.</Li>}
        </Ul>
        <P>
          Click any <strong>column header</strong> to sort the table by that column. Click again to reverse the sort order.
        </P>

        <P><strong>Contacts Pagination</strong></P>
        <P>
          At the bottom of the table, pagination controls let you navigate between pages. The page size
          and total count are displayed. Use the arrow buttons to move between pages.
        </P>

        {isViewAdmin ? (
          <>
            <P><strong>Contacts Export</strong> (Admin only)</P>
            <P>
              Admins see an <strong>"Export"</strong> dropdown button on the Contacts tab toolbar. Click it to download the contact list as:
            </P>
            <div className="flex flex-wrap gap-2 my-3">
              <Badge color="blue">CSV</Badge>
              <Badge color="green">Excel (.xlsx)</Badge>
              <Badge color="red">PDF</Badge>
              <Badge color="gray">Print</Badge>
            </div>
            <P>PDF and Print exports include configured logos from Export Settings. Print opens a new window with a formatted table for printing.</P>
            <Screenshot name="invitees-contacts-export" caption="Export contacts — choose CSV, Excel, PDF, or Print" />
          </>
        ) : (
          <>
            <P><strong>Contacts Import</strong> (Organizers & Directors)</P>
            <P>
              Click <strong>"Import"</strong> to bulk-add contacts from a spreadsheet:
            </P>
            <StepList steps={[
              'Click "Import" to open the Bulk Import Contacts modal.',
              'Step 1: Click "Download Template (.xlsx)" to get a pre-formatted template.',
              'Fill in the template in Excel/Sheets with your contact data.',
              'Step 2: Drag and drop the filled file onto the upload area, or click to browse. Supports .xlsx, .xls, and .csv files.',
              'Click "Import Contacts" to upload and process the file.',
            ]} />
            <Screenshot name="invitees-import" caption="Bulk Import modal — download template, fill, upload, and import" />
          </>
        )}

        {isViewAdmin && (
          <>
            <H3><Shield className="w-5 h-5 text-purple-500" /> Admin-Only: Admin Bulk Import</H3>
            <P>
              Admins have an additional <strong>"Admin Import"</strong> button on the Contacts tab. This imports
              contacts across <strong>all inviter groups</strong> at once. The template includes extra columns:
            </P>
            <Ul>
              <Li><code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Inviter_Group</code> — The group name (must already exist in the system).</Li>
              <Li><code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Inviter_Name</code> — The inviter name. If the inviter doesn't exist within the specified group, they are <strong>auto-created</strong>.</Li>
            </Ul>
            <Screenshot name="invitees-admin-import" caption="Admin Import — bulk import contacts across all groups" />

            <H3>Admin-Only: Manage Categories</H3>
            <P>
              Admins see a <strong>"Manage Categories"</strong> button on the Contacts tab. Click it to open a modal
              where you can:
            </P>
            <Ul>
              <Li><strong>View all categories</strong> — Listed with their current usage count.</Li>
              <Li><strong>Add a category</strong> — Type a name and click Add.</Li>
              <Li><strong>Edit a category</strong> — Click the pencil icon to rename.</Li>
              <Li><strong>Delete a category</strong> — Click the trash icon. Contacts using this category will have it removed.</Li>
            </Ul>
            <Screenshot name="invitees-categories" caption="Manage Categories modal — add, edit, or delete categories" />

            <H3>Admin-Only: Bulk Delete</H3>
            <P>
              Admins can select multiple contacts using the checkboxes in the table, then click <strong>"Delete Selected"</strong>
              to remove them all at once. A confirmation dialog appears before deletion.
            </P>
          </>
        )}

        <Tip>Contacts are reusable — add a contact once in the Contacts tab, then submit them to any number of events from the Events tab.</Tip>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* APPROVALS (Director + Admin)                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {roleHas(viewRole, ['admin', 'director']) && (
        <Section id="approvals" icon={CheckSquare} title="Approvals" badge="Director & Admin">
          <P>
            The Approvals page shows all invitee submissions for review.
            It has <strong>two tabs</strong>: <Badge color="yellow">Pending</Badge> and <Badge color="green">Approved</Badge>.
          </P>
          {isViewAdmin && (
            <InfoBox>
              Admins have <strong>read-only access</strong> on the Approvals page. You can view and filter all pending and approved invitees
              across all groups, but you cannot approve, reject, or cancel approvals. Only Directors can take these actions.
            </InfoBox>
          )}

          <H3>Pending Tab</H3>
          <P>
            Shows all invitations waiting for review. Each row displays the invitee name, event,
            inviter{isViewAdmin ? ', inviter group' : ''}, submitted by, submission date{!isViewAdmin && ', and action buttons'}.
          </P>
          <Screenshot name="approvals-pending" caption="Pending tab — invitees awaiting review" />

          {isViewDirector && (
            <>
              <P><strong>Quick Approve (Director)</strong></P>
              <P>
                Each row has a <strong>green checkmark (✓)</strong> button in the Actions column.
                Click it to <strong>instantly approve</strong> the invitee without any modal — a success toast confirms the action.
              </P>

              <P><strong>Reject a Single Invitee (Director)</strong></P>
              <StepList steps={[
                'Click the red ✗ button on the invitee row.',
                'A modal appears with a text area for the rejection note.',
                'Optionally enter a reason explaining why the invitee was rejected.',
                'Click "Reject". The invitee is marked as rejected and the organizer will see your reason on the Events tab.',
              ]} />
              <Screenshot name="approvals-reject" caption="Reject modal — provide an optional reason for the organizer" />

              <P><strong>Bulk Approve (Director)</strong></P>
              <StepList steps={[
                'Use the checkboxes on the left of each row to select multiple invitees.',
                'Use the top checkbox to select/deselect all visible invitees.',
                'Click the "Approve Selected" button that appears above the table.',
                'A confirmation modal shows how many invitees will be approved.',
                'Optionally add a note.',
                'Click "Approve All" to approve them all at once.',
              ]} />
              <Screenshot name="approvals-bulk-approve" caption="Bulk approve — select multiple and approve at once" />

              <P><strong>Bulk Reject (Director)</strong></P>
              <StepList steps={[
                'Select multiple invitees using checkboxes.',
                'Click the "Reject Selected" button.',
                'Enter a rejection reason in the modal.',
                'Click "Reject All" to reject them all.',
              ]} />
            </>
          )}

          <P><strong>Pending Tab Filters</strong></P>
          <Ul>
            <Li><strong>Search bar</strong> — Search by invitee name (debounced input).</Li>
            <Li><strong>Event filter</strong> — Dropdown to filter by specific event.</Li>
            {isViewAdmin && <Li><strong>Group filter</strong> (Admin only) — Filter by inviter group.</Li>}
            <Li><strong>Category filter</strong> — Filter by invitee category.</Li>
            <Li><strong>Sort</strong> — Click column headers to sort ascending/descending.</Li>
          </Ul>
          <Screenshot name="approvals-filters" caption="Filters — search, event, group, and category" />

          <H3>Approved Tab</H3>
          <P>
            Shows all approved invitees across all events. Each row displays name, event, inviter,
            {isViewAdmin ? ' group,' : ''} category, submitted by, approved by{!isViewAdmin && ', and action buttons'}.
          </P>
          <Screenshot name="approvals-approved" caption="Approved tab — list of all approved invitees" />

          {isViewDirector && (
            <>
              <P><strong>Cancel an Approval (Director)</strong></P>
              <P>
                If an approved invitee needs to be revoked, click the <strong>"Cancel Approval"</strong> button (undo icon)
                on their row. A confirmation modal appears asking for a rejection reason (required).
                Click "Cancel Approval" to revert them to rejected status.
                You can also select multiple approved invitees and click "Cancel Selected" for bulk cancellation.
              </P>
              <Screenshot name="approvals-cancel" caption="Cancel approval — revert an approved invitee" />
            </>
          )}

          <P><strong>Approved Tab Filters</strong></P>
          <P>Same filters as the Pending tab: search, event{isViewAdmin ? ', group' : ''}, and category.</P>

          {isViewDirector && (
            <Tip>
              Review pending approvals regularly — Organizers are waiting on your decision! Use bulk approve/reject to process large batches quickly.
            </Tip>
          )}
        </Section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* EVENTS (Admin only)                                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isViewAdmin && (
        <Section id="events" icon={Calendar} title="Events Management" badge="Admin Only">
          <P>
            The Events page lets Admins create, edit, and manage all events in the system.
            Events are displayed as <strong>cards</strong> in a grid layout. Each card shows the event name,
            dates, venue, status badge, invitee count, and assigned inviter groups.
          </P>
          <Screenshot name="events-grid" caption="Events page — all events displayed as cards in a grid" />

          <H3>Event Search & Filter</H3>
          <Ul>
            <Li><strong>Search bar</strong> — Type to filter events by name (instant filtering).</Li>
            <Li><strong>Status filter</strong> — Dropdown to filter by event status (All, Upcoming, Ongoing, Ended, On Hold, Cancelled).</Li>
          </Ul>
          <Screenshot name="events-search" caption="Search and filter events by name and status" />

          <H3>Event Statuses</H3>
          <div className="flex flex-wrap gap-2 my-3">
            <Badge color="blue">Upcoming</Badge>
            <Badge color="green">Ongoing</Badge>
            <Badge color="gray">Ended</Badge>
            <Badge color="yellow">On Hold</Badge>
            <Badge color="red">Cancelled</Badge>
          </div>
          <P>
            Statuses update automatically based on event start/end dates. You can also manually change an event's status
            at any time using the "Change Status" action.
          </P>

          <H3>Creating an Event</H3>
          <P>Click the <strong>"+ Create Event"</strong> button (top-right) to open the creation modal. Fill in:</P>
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
                <tr><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 font-medium">Event Name</td><td className="text-center px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 text-green-500">✓</td><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">The event title displayed everywhere</td></tr>
                <tr><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 font-medium">Start Date & Time</td><td className="text-center px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 text-green-500">✓</td><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">When the event begins (date and time picker)</td></tr>
                <tr><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 font-medium">End Date & Time</td><td className="text-center px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 text-green-500">✓</td><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">When the event ends</td></tr>
                <tr><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 font-medium">Venue</td><td className="text-center px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 text-gray-400">—</td><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">Physical location or venue name</td></tr>
                <tr><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 font-medium">Description</td><td className="text-center px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 text-gray-400">—</td><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">Additional event details/notes</td></tr>
                <tr><td className="px-3 py-2 font-medium">Inviter Groups</td><td className="text-center px-3 py-2 text-green-500">✓</td><td className="px-3 py-2">Choose "All Groups" to assign all, or pick specific groups. Only assigned groups can submit invitees to this event.</td></tr>
              </tbody>
            </table>
          </div>
          <StepList steps={[
            'Click "+ Create Event".',
            'Fill in the event name, start date/time, end date/time.',
            'Optionally add venue and description.',
            'Select inviter groups — choose "All Groups" or pick specific ones.',
            'Click "Create Event" to save.',
          ]} />
          <Screenshot name="events-create" caption="Create Event modal — fill in all event details" />

          <H3>Editing an Event</H3>
          <P>
            Click the <strong>pencil (Edit) icon</strong> on any event card. The same modal as "Create Event" appears,
            pre-filled with the event's current data. Make changes and click "Save Changes".
          </P>
          <Screenshot name="events-edit" caption="Edit Event — modify details of an existing event" />

          <H3>Event Card Actions</H3>
          <P>Each event card has action buttons at the bottom. Here is every action available:</P>
          <div className="overflow-x-auto my-3">
            <table className="w-full text-sm border-collapse">
              <tbody className="text-gray-600 dark:text-gray-400">
                <tr className="border-b border-gray-100 dark:border-gray-700/50"><td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300 w-44">Edit</td><td className="px-3 py-2">Opens the edit modal to modify event name, dates, venue, description, and assigned groups.</td></tr>
                <tr className="border-b border-gray-100 dark:border-gray-700/50"><td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">Set Quotas</td><td className="px-3 py-2">Opens a modal to set the maximum number of invitees each inviter group can submit for this event.</td></tr>
                <tr className="border-b border-gray-100 dark:border-gray-700/50"><td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">Check-in Settings</td><td className="px-3 py-2">Opens a modal to generate/manage the check-in PIN, view event code, and copy console/live dashboard URLs.</td></tr>
                <tr className="border-b border-gray-100 dark:border-gray-700/50"><td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">Change Status</td><td className="px-3 py-2">Opens a dropdown to manually set the event status (Upcoming, Ongoing, Ended, On Hold, Cancelled).</td></tr>
                <tr><td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">Delete</td><td className="px-3 py-2">Permanently deletes the event and ALL related data (invitees, approvals, attendance). A confirmation dialog warns you before proceeding.</td></tr>
              </tbody>
            </table>
          </div>
          <Screenshot name="events-actions" caption="Event card action buttons — edit, quotas, check-in, status, delete" />

          <H3><Key className="w-5 h-5 text-amber-500" /> Check-in PIN & Links</H3>
          <P>
            Click <strong>"Check-in Settings"</strong> on an event card to open the check-in configuration modal.
            This is where you set up the event for door check-in.
          </P>
          <P><strong>Generate a PIN:</strong></P>
          <StepList steps={[
            'Click "Generate PIN" (or "Regenerate" if one already exists).',
            'A 6-digit PIN is created along with a unique Event Code.',
            'The system generates two shareable URLs: Check-in Console URL and Live Dashboard URL.',
            'Copy each URL using the copy button next to it.',
            'Share the Console URL and PIN with the check-in operator.',
            'Share the Live Dashboard URL with anyone who needs real-time event stats.',
          ]} />
          <P><strong>PIN controls:</strong></P>
          <Ul>
            <Li><strong>Activate / Deactivate</strong> — Toggle the PIN on/off. When deactivated, the check-in console and live dashboard become inaccessible.</Li>
            <Li><strong>Auto-deactivate</strong> — Set the PIN to automatically deactivate a number of hours after the event ends (e.g., 24 hours).</Li>
            <Li><strong>Regenerate</strong> — Create a new PIN (invalidates the old one). Anyone currently logged into the check-in console will be logged out.</Li>
          </Ul>
          <Screenshot name="events-pin" caption="Check-in settings modal — PIN, event code, and shareable URLs" />

          <H3><Gauge className="w-5 h-5 text-purple-500" /> Group Quotas</H3>
          <P>
            Click <strong>"Set Quotas"</strong> on an event card to open the quota management modal.
          </P>
          <Ul>
            <Li>Each assigned inviter group is listed with an input field for the maximum number of invitees.</Li>
            <Li>A <strong>progress bar</strong> shows current usage vs. the quota limit.</Li>
            <Li>Leave the field blank or set to 0 for <strong>unlimited</strong> submissions.</Li>
            <Li>Over-quota groups are <strong>highlighted in red</strong>.</Li>
            <Li>Click "Save Quotas" to apply changes.</Li>
          </Ul>
          <Screenshot name="events-quotas" caption="Quota modal — set max invitees per group with usage progress bars" />

          <H3>Deleting an Event</H3>
          <P>
            Click the <strong>trash icon</strong> on the event card. A confirmation dialog warns that
            this will permanently delete the event and <strong>all related data</strong> (invitees, approvals, attendance records).
            If the event has invitees, an amber warning shows how many will be affected. Click "Delete" to confirm.
          </P>
          <Screenshot name="events-delete" caption="Delete confirmation — warns about permanent data loss" />

          <Tip>Set group quotas before organizers start submitting — this prevents over-submission and ensures fair distribution.</Tip>
        </Section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ATTENDANCE (Admin only)                                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isViewAdmin && (
        <Section id="attendance" icon={UserCheck} title="Attendance" badge="Admin Only">
          <P>
            The Attendance page tracks the full lifecycle of approved invitees: code generation → invitation sent → confirmation received → checked in at the door.
          </P>

          <H3>Step 1: Select an Event</H3>
          <P>
            Use the <strong>"Select Event"</strong> dropdown at the top to choose an event.
            Only events that have approved invitees appear. Once selected, the page loads
            all attendance data for that event.
          </P>
          <Screenshot name="attendance-event-select" caption="Select an event to view its attendance data" />

          <H3>Event Info & Check-in PIN Bar</H3>
          <P>
            After selecting an event, an info bar shows the event name, dates, and venue.
            If a check-in PIN exists, a <strong>PIN status bar</strong> appears showing:
          </P>
          <Ul>
            <Li><strong>PIN status</strong> — Green "Active" or red "Inactive" badge.</Li>
            <Li><strong>Event Code</strong> — The unique event identifier.</Li>
            <Li><strong>Copy PIN</strong> — Click to copy the PIN to clipboard.</Li>
            <Li><strong>Copy Console URL</strong> — Click to copy the check-in console link.</Li>
            <Li><strong>Toggle PIN</strong> — Activate/deactivate the PIN directly from this bar.</Li>
          </Ul>
          <Screenshot name="attendance-pin-bar" caption="PIN status bar — quick controls without leaving Attendance" />

          <H3>Statistics Cards</H3>
          <P>
            Four statistics cards appear below the event info, providing a real-time overview:
          </P>
          <Ul>
            <Li><Badge color="blue">Total Approved</Badge> — Total number of approved invitees for this event.</Li>
            <Li><Badge color="green">Codes Generated</Badge> — How many unique invitation codes have been generated.</Li>
            <Li><Badge color="yellow">Invitations Sent</Badge> — How many invitations have been marked as sent.</Li>
            <Li><Badge color="purple">Checked In</Badge> — How many attendees have been checked in at the door.</Li>
          </Ul>
          <P>Additional stats shown: confirmed coming, confirmed not coming, not responded, total guests expected.</P>
          <Screenshot name="attendance-stats" caption="Attendance statistics cards — real-time overview" />

          <H3>Step 2: Generate Invitation Codes</H3>
          <P>
            Before sending invitations, you need to generate unique codes for each invitee.
          </P>
          <StepList steps={[
            'Select invitees using the checkboxes (or use "Select All").',
            'Click "Generate Codes" from the bulk actions area.',
            'A confirmation modal shows how many codes will be generated.',
            'Click "Generate" to create unique invitation codes for all selected invitees.',
            'Each invitee now has a unique code visible in the "Code" column.',
          ]} />
          <P>You can also generate a code for a <strong>single invitee</strong> by clicking the code icon on their row.</P>
          <Screenshot name="attendance-generate-codes" caption="Generate invitation codes for selected invitees" />

          <H3>Step 3: Mark Invitations as Sent</H3>
          <P>
            After sending invitations (via email, SMS, or physically), mark them as sent in the system:
          </P>
          <StepList steps={[
            'Select invitees who have been sent their invitations.',
            'Click "Mark Sent" from the bulk actions.',
            'Or click the send icon on individual rows.',
            'The "Sent" column updates to show a green checkmark.',
          ]} />
          <P>
            You can <strong>undo "Mark Sent"</strong> if you made a mistake — select the invitees and click
            "Undo Sent", or click the undo icon on individual rows.
          </P>
          <Screenshot name="attendance-mark-sent" caption="Mark invitations as sent — bulk or individual" />

          <H3>Step 4: Track Confirmations</H3>
          <P>
            As invitees respond via the Portal page, their confirmation status updates automatically:
          </P>
          <Ul>
            <Li><Badge color="green">Confirmed</Badge> — Invitee confirmed they are coming (with guest count).</Li>
            <Li><Badge color="red">Not Coming</Badge> — Invitee declined.</Li>
            <Li><Badge color="gray">No Response</Badge> — Invitee hasn't responded yet.</Li>
          </Ul>
          <P>
            You can also <strong>manually confirm attendance</strong> or <strong>reset confirmations</strong>:
          </P>
          <Ul>
            <Li><strong>Confirm Attendance</strong> — Select invitees and click "Confirm Attendance" to manually mark them as confirmed.</Li>
            <Li><strong>Reset Confirmation</strong> — Select invitees and click "Reset Confirmation" to revert their response to "No Response".</Li>
          </Ul>
          <Screenshot name="attendance-confirmations" caption="Track and manage confirmations" />

          <H3>Step 5: Check-in at the Event</H3>
          <P>
            Attendees can be checked in via the <strong>Check-in Console</strong> (see Public Pages section),
            or you can manually check them in from this page:
          </P>
          <Ul>
            <Li>Click the <strong>check-in button</strong> on an invitee row to mark them as arrived.</Li>
            <Li>Click <strong>"Undo Check-in"</strong> to revert if done by mistake.</Li>
          </Ul>

          <H3>Filters & Search</H3>
          <Ul>
            <Li><strong>Search bar</strong> — Search by invitee name, code, or phone.</Li>
            <Li><strong>Confirmation status filter</strong> — Filter by: All, Confirmed, Not Coming, No Response.</Li>
            <Li><strong>Sent status filter</strong> — Filter by: All, Sent, Not Sent.</Li>
            <Li><strong>Check-in status filter</strong> — Filter by: All, Checked In, Not Checked In.</Li>
            <Li><strong>Sort</strong> — Click any column header to sort.</Li>
          </Ul>
          <Screenshot name="attendance-filters" caption="Attendance filters — search, confirmation, sent, check-in status" />

          <H3>Export Attendance Data</H3>
          <P>
            Click the <strong>"Export"</strong> dropdown to download attendance data as Excel, CSV, PDF, or Print.
            Exports include all columns: name, inviter, group, code, sent status, confirmation, guests, check-in status, and times.
            PDF and Excel exports include configured logos.
          </P>
          <Screenshot name="attendance-export" caption="Export attendance — Excel, CSV, PDF, or Print" />

          <Tip>Generate codes and mark invitations as sent to keep an accurate record. Use the filters to quickly find who hasn't responded or hasn't checked in.</Tip>
        </Section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* REPORTS (Director + Admin)                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {roleHas(viewRole, ['admin', 'director']) && (
        <Section id="reports" icon={FileText} title="Reports" badge="Director & Admin">
          <P>
            The Reports page provides powerful analytics and data exports. At the top, you see
            <strong> report type cards</strong> — click one to select it, then apply filters and generate the report.
          </P>
          <Screenshot name="reports-overview" caption="Reports page — report type cards at the top" />

          <H3>How to Generate a Report</H3>
          <StepList steps={[
            'Click on a report type card at the top (e.g., "Invitees by Group").',
            'The selected card highlights in blue/indigo.',
            'Apply filters (event, group, status, etc.) as needed.',
            'Click "Generate Report" to load the data.',
            'The report table appears below with the results.',
            'Use the "Export" button to download in your preferred format.',
          ]} />

          <H3>Available Report Types</H3>
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
                <tr className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="px-3 py-2 font-medium">Invitees by Group</td>
                  <td className="px-3 py-2">Summary counts per inviter group for the selected event: total submitted, pending, approved, rejected. Shows a row per group with aggregate numbers.</td>
                  <td className="text-center px-3 py-2"><Badge color="green">All</Badge></td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="px-3 py-2 font-medium">Invitees by Inviter</td>
                  <td className="px-3 py-2">Summary counts per individual inviter: total submitted, pending, approved, rejected. Filter by event and group.</td>
                  <td className="text-center px-3 py-2"><Badge color="green">All</Badge></td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="px-3 py-2 font-medium">Detailed Invitees</td>
                  <td className="px-3 py-2">Full list of invitees with name, phone, email, inviter, group, category, status, guests, submission date. Paginated, sortable, and filterable by event, group, and status.</td>
                  <td className="text-center px-3 py-2"><Badge color="green">All</Badge></td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="px-3 py-2 font-medium">Full Approved Details</td>
                  <td className="px-3 py-2">Approved invitees with full attendance tracking: invitation code, code sent status, confirmation status, guest count, check-in status, check-in time. Paginated and filterable.</td>
                  <td className="text-center px-3 py-2"><Badge color="green">All</Badge></td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="px-3 py-2 font-medium">Activity Log</td>
                  <td className="px-3 py-2">Complete audit trail of all system actions: who did what, when, and to whom. Filter by action type (approve, reject, create, etc.), user, and date range. Paginated and searchable.</td>
                  <td className="text-center px-3 py-2"><Badge color="purple">Admin</Badge></td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">Historical Data</td>
                  <td className="px-3 py-2">Archived invitee data from previous imports and past events. Filterable by event, group, inviter, and search term. Paginated.</td>
                  <td className="text-center px-3 py-2"><Badge color="purple">Admin</Badge></td>
                </tr>
              </tbody>
            </table>
          </div>

          <H3>Report Filters</H3>
          <P>Each report type has its own set of applicable filters:</P>
          <Ul>
            <Li><strong>Event filter</strong> — Select a specific event (available on all report types).</Li>
            <Li><strong>Group filter</strong> — Filter by inviter group (Summary and Detail reports).</Li>
            <Li><strong>Status filter</strong> — Filter by approval status: All, Pending, Approved, Rejected (Detail reports).</Li>
            <Li><strong>Search</strong> — Text search across names and other fields (Detail and Approved reports).</Li>
            {isViewAdmin && <Li><strong>Action filter</strong> (Activity Log, Admin only) — Filter by action type (e.g., approve, reject, create_event, delete, etc.).</Li>}
            {isViewAdmin && <Li><strong>User filter</strong> (Activity Log, Admin only) — Filter by which user performed the action.</Li>}
            {isViewAdmin && <Li><strong>Inviter filter</strong> (Historical Data, Admin only) — Filter by specific inviter.</Li>}
          </Ul>
          <Screenshot name="reports-filters" caption="Report filters — vary by report type" />

          <H3>Report Results Table</H3>
          <P>
            After clicking "Generate Report", the results appear in a table below. For paginated reports
            (Detailed, Approved, Activity Log, Historical), use the pagination controls at the bottom
            to navigate between pages. Click column headers to sort.
          </P>
          <Screenshot name="reports-table" caption="Report results table with pagination and sorting" />

          <H3><Download className="w-5 h-5 text-indigo-500" /> Export Formats</H3>
          <P>Every report can be exported in multiple formats. Click the "Export" dropdown:</P>
          <div className="flex flex-wrap gap-2 my-3">
            <Badge color="green">Excel (.xlsx)</Badge>
            <Badge color="blue">CSV</Badge>
            <Badge color="red">PDF</Badge>
            <Badge color="gray">Print</Badge>
          </div>
          <Ul>
            <Li><strong>Excel</strong> — Downloads a .xlsx file with all data, formatted with headers. Includes configured logos if set in Export Settings.</Li>
            <Li><strong>CSV</strong> — Downloads a plain .csv file suitable for importing into other tools.</Li>
            <Li><strong>PDF</strong> — Generates a formatted PDF document with logos, headers, and styled tables.</Li>
            <Li><strong>Print</strong> — Opens the browser print dialog with a printer-friendly layout including logos.</Li>
          </Ul>
          <Screenshot name="reports-export" caption="Export dropdown — choose Excel, CSV, PDF, or Print" />

          {isViewDirector && (
            <InfoBox>
              As a Director, reports are automatically filtered to your group's data. You cannot see data from other groups.
            </InfoBox>
          )}
          {isViewAdmin && (
            <InfoBox>
              As an Admin, you see data across all groups. The Activity Log and Historical Data reports are exclusive to Admins and provide full audit and archive capabilities.
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
            The Users page is Admin-only and has <strong>three tabs</strong>:
            <Badge color="indigo">Users</Badge>, <Badge color="indigo">Inviter Groups</Badge>, and <Badge color="indigo">Inviters</Badge>.
          </P>

          {/* ── USERS TAB ── */}
          <H3><UserCog className="w-5 h-5 text-indigo-500" /> Users Tab</H3>
          <P>
            Manage all system user accounts. At the top, you see <strong>statistics cards</strong> showing:
            Total Users, Admins, Directors, and Organizers. Clicking a card filters the table to that role.
          </P>
          <Screenshot name="users-list" caption="Users tab — user statistics and account table" />

          <P><strong>Create a New User</strong></P>
          <P>Click <strong>"+ Create User"</strong> to open the creation modal:</P>
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
                <tr><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 font-medium">Username</td><td className="text-center px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 text-green-500">✓</td><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">Unique login username</td></tr>
                <tr><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 font-medium">Full Name</td><td className="text-center px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 text-green-500">✓</td><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">User's display name</td></tr>
                <tr><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 font-medium">Email</td><td className="text-center px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 text-green-500">✓</td><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">User's email address</td></tr>
                <tr><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 font-medium">Password</td><td className="text-center px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 text-green-500">✓</td><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">Initial password for the account</td></tr>
                <tr><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 font-medium">Role</td><td className="text-center px-3 py-2 border-b border-gray-100 dark:border-gray-700/50 text-green-500">✓</td><td className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/50">Select: Admin, Director, or Organizer</td></tr>
                <tr><td className="px-3 py-2 font-medium">Inviter Group</td><td className="text-center px-3 py-2 text-green-500">✓*</td><td className="px-3 py-2">Required for Directors and Organizers. Select which group this user belongs to.</td></tr>
              </tbody>
            </table>
          </div>
          <Screenshot name="users-create" caption="Create User modal — set all account details" />

          <P><strong>Edit a User</strong></P>
          <P>
            Click the <strong>pencil icon</strong> on a user row to open the edit modal.
            You can change the username, full name, email, role, and inviter group.
            Click "Save Changes" when done.
          </P>

          <P><strong>Reset Password</strong></P>
          <P>
            Click the <strong>key icon</strong> on a user row. A modal appears where you enter
            a new password. Click "Reset Password" to save. The user will need to use the new password on their next login.
          </P>
          <Screenshot name="users-reset-password" caption="Reset Password modal — set a new password for the user" />

          <P><strong>Activate / Deactivate a User</strong></P>
          <P>
            Click the <strong>toggle icon</strong> on a user row to activate or deactivate the account.
            Deactivated users cannot log in but their data is preserved. A confirmation dialog appears before changing status.
          </P>

          <P><strong>Users Table Columns</strong></P>
          <Ul>
            <Li><strong>Username</strong> — Login username.</Li>
            <Li><strong>Full Name</strong> — Display name.</Li>
            <Li><strong>Email</strong> — Email address.</Li>
            <Li><strong>Role</strong> — Color-coded badge (Admin = purple, Director = green, Organizer = blue).</Li>
            <Li><strong>Group</strong> — Inviter group assignment.</Li>
            <Li><strong>Status</strong> — Active (green) or Inactive (red).</Li>
            <Li><strong>Created</strong> — Account creation date.</Li>
            <Li><strong>Actions</strong> — Edit, Reset Password, Activate/Deactivate buttons.</Li>
          </Ul>

          <P><strong>Users Filters</strong></P>
          <Ul>
            <Li><strong>Search bar</strong> — Search by username, name, or email.</Li>
            <Li><strong>Role filter</strong> — Click the stat cards (Total, Admins, Directors, Organizers) to filter by role.</Li>
            <Li><strong>Status filter</strong> — Dropdown to filter by: All, Active, Inactive.</Li>
            <Li><strong>Sort</strong> — Click column headers to sort.</Li>
          </Ul>
          <Screenshot name="users-filters" caption="User filters — search, role cards, and status filter" />

          {/* ── INVITER GROUPS TAB ── */}
          <H3><Users className="w-5 h-5 text-indigo-500" /> Inviter Groups Tab</H3>
          <P>
            Inviter Groups are organizational units (e.g., departments, companies) that contain inviters and their contacts.
            Each Director and Organizer belongs to one group.
          </P>
          <Screenshot name="users-groups" caption="Inviter Groups tab — manage organizational groups" />

          <P><strong>Create a Group</strong></P>
          <StepList steps={[
            'Click "+ Create Group".',
            'Enter the Group Name (required).',
            'Optionally add a Description.',
            'Click "Create" to save the new group.',
          ]} />
          <Screenshot name="users-create-group" caption="Create Group modal — name and description" />

          <P><strong>Edit a Group</strong></P>
          <P>Click the pencil icon on a group row to edit its name and description.</P>

          <P><strong>Delete a Group</strong></P>
          <P>
            Click the trash icon on a group row. A confirmation dialog warns that deleting a group
            affects all users and inviters assigned to it. Click "Delete" to confirm.
          </P>

          <P><strong>Groups Table</strong></P>
          <P>
            Displays group name, description, number of inviters, number of contacts, and action buttons.
            Click column headers to sort. Use the search bar to filter groups by name.
          </P>

          {/* ── INVITERS TAB ── */}
          <H3><UserCheck className="w-5 h-5 text-indigo-500" /> Inviters Tab</H3>
          <P>
            Inviters are the individuals within a group who "own" contacts. When a contact is added,
            it's assigned to an inviter. Inviters are displayed in a table showing name, group, contact count,
            status, and actions.
          </P>
          <Screenshot name="users-inviters" caption="Inviters tab — manage individual inviters within groups" />

          <P><strong>Create an Inviter</strong></P>
          <StepList steps={[
            'Click "+ Create Inviter".',
            'Enter the Inviter Name (required).',
            'Select the Inviter Group from the dropdown (required).',
            'Click "Create" to save.',
          ]} />
          <Screenshot name="users-create-inviter" caption="Create Inviter modal — name and group assignment" />

          <P><strong>Edit an Inviter</strong></P>
          <P>Click the pencil icon to edit the inviter's name or move them to a different group.</P>

          <P><strong>Delete an Inviter</strong></P>
          <P>Click the trash icon. A confirmation appears. Deleting an inviter removes their association with contacts.</P>

          <P><strong>Activate / Deactivate an Inviter</strong></P>
          <P>Click the toggle icon to activate or deactivate an inviter. Inactive inviters cannot be assigned new contacts.</P>

          <P><strong>Bulk Delete Inviters</strong></P>
          <P>
            Select multiple inviters using checkboxes, then click "Delete Selected" to remove them all at once.
          </P>

          <P><strong>Inviters Filters</strong></P>
          <Ul>
            <Li><strong>Search bar</strong> — Search by inviter name.</Li>
            <Li><strong>Group filter</strong> — Filter by inviter group.</Li>
            <Li><strong>Sort</strong> — Click column headers to sort.</Li>
          </Ul>

          <Tip>Create inviter groups first, then create inviters within those groups, and finally create user accounts assigned to those groups.</Tip>
        </Section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SETTINGS (Admin only)                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isViewAdmin && (
        <Section id="settings-section" icon={Settings} title="Export Settings" badge="Admin Only">
          <P>
            The Export Settings page lets Admins configure export logos and perform full data backups.
            It has two sections: <strong>Export Logos</strong> (always visible) and a collapsible <strong>Data Backup & Export</strong> section.
          </P>

          <H3><ImageIcon className="w-5 h-5 text-indigo-500" /> Export Logos</H3>
          <P>
            You can configure two logos: a <strong>Left Logo</strong> and a <strong>Right Logo</strong>.
            These appear in the header area of PDF, Excel, and printed reports.
          </P>

          <P><strong>Upload a Logo</strong></P>
          <StepList steps={[
            'Click the "Upload" button under the Left Logo or Right Logo card.',
            'Select an image file (PNG, JPEG, WebP, or SVG — max 2 MB).',
            'The image appears as a preview with an orange "Pending Upload" status badge.',
            'Optionally click "Edit" to open the Image Editor for cropping and resizing.',
            'Click "Save Changes" in the sticky bar at the bottom to upload to the server.',
          ]} />
          <Screenshot name="settings-upload-logo" caption="Upload a logo — select file, preview, and save" />

          <P><strong>Image Editor</strong></P>
          <P>
            After uploading or clicking "Edit" on an existing logo, the Image Editor modal opens. It allows you to:
          </P>
          <Ul>
            <Li><strong>Crop</strong> — Drag the crop area to select the portion of the image you want.</Li>
            <Li><strong>Resize</strong> — Adjust the output dimensions.</Li>
            <Li>Click "Apply" to save your edits, or "Cancel" to discard.</Li>
          </Ul>
          <Screenshot name="settings-image-editor" caption="Image Editor — crop and resize your logo" />

          <P><strong>Logo Scale & Vertical Extension</strong></P>
          <P>
            Below the logo cards, a shared sizing panel lets you adjust how logos appear on exports:
          </P>
          <Ul>
            <Li><strong>Scale</strong> — A slider (60% to 200%) to increase or decrease the logo size. Default is 100%.</Li>
            <Li><strong>Extend Up</strong> — A slider (0–30px) that extends the logo upward in the export header.</Li>
            <Li><strong>Extend Down</strong> — A slider (0–30px) that extends the logo downward in the export header.</Li>
          </Ul>
          <P>A "Reset to defaults" link appears when any value differs from the default. Changes are reflected in the <strong>Live Preview</strong> section.</P>

          <P><strong>Remove a Logo</strong></P>
          <P>
            Click the <strong>"Remove"</strong> button under a logo to mark it for deletion.
            The logo shows a red "Will Be Removed" status. Click "Save Changes" to confirm the removal,
            or "Discard" to undo.
          </P>

          <P><strong>Live Preview</strong></P>
          <P>
            At the bottom of the Export Logos section, a live preview shows how the left and right logos
            will appear on your exported reports, with the current scale and extension settings applied in real time.
          </P>
          <Screenshot name="settings-preview" caption="Live preview — see how logos appear on exported reports" />

          <P><strong>Saving Changes</strong></P>
          <P>
            When you have unsaved changes, a sticky <strong>"You have unsaved changes"</strong> bar appears at the bottom
            with "Discard" and "Save Changes" buttons. Click "Save Changes" to upload all pending logo changes to the server.
            A success toast confirms the save. All future exports will use the updated logos.
          </P>

          <H3><Download className="w-5 h-5 text-emerald-500" /> Data Backup & Export</H3>
          <P>
            Below the Export Logos section, a collapsible <strong>"Data Backup & Export"</strong> accordion section
            lets you download a full backup of your system data for migration or archival purposes.
          </P>

          <P><strong>Step 1: Select Data Tables</strong></P>
          <P>
            Choose which data tables to include in the backup. Click individual table cards or use "Select All" / "Deselect All":
          </P>
          <Ul>
            <Li><strong>Users</strong> — All user accounts and roles.</Li>
            <Li><strong>Inviter Groups</strong> — Department/team groups.</Li>
            <Li><strong>Inviters</strong> — Individual inviters within groups.</Li>
            <Li><strong>Contacts</strong> — All invitee/contact records.</Li>
            <Li><strong>Events</strong> — All event definitions.</Li>
            <Li><strong>Event Assignments</strong> — Event-invitee links, statuses, attendance data.</Li>
            <Li><strong>Categories</strong> — Invitee categories.</Li>
          </Ul>
          <Screenshot name="settings-backup-tables" caption="Select data tables to include in the backup" />

          <P><strong>Step 2: Options</strong></P>
          <P>
            An amber security panel provides the option to <strong>"Include password hashes"</strong> — enable this
            only if you need a full system migration. Keep the exported file secure.
          </P>

          <P><strong>Step 3: Choose Export Format</strong></P>
          <P>
            Three export format buttons are available:
          </P>
          <div className="flex flex-wrap gap-2 my-3">
            <Badge color="green">JSON — Full structure</Badge>
            <Badge color="blue">CSV — One file per table</Badge>
            <Badge color="purple">Excel — Multi-sheet workbook</Badge>
          </div>
          <P>
            Click an export button to download the backup. A loading toast appears while the data is prepared.
            After download, a green info bar shows the last backup date and record counts per table.
          </P>
          <Screenshot name="settings-backup-export" caption="Data Backup — choose JSON, CSV, or Excel export format" />

          <Tip>Use transparent PNG logos for the best results on exports. The Image Editor lets you crop away any unwanted whitespace. Use the Data Backup section regularly to keep offline copies of your system data.</Tip>
        </Section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PROFILE                                                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Section id="profile" icon={UserCog} title="Profile & Settings">
        <P>
          The Profile page shows your account information and provides tools for password management
          and application maintenance. Access it from the sidebar or the user dropdown in the header.
        </P>

        <H3>Account Information</H3>
        <P>The top section displays your account details in a card format:</P>
        <Ul>
          <Li><strong>Full Name</strong> — Your display name.</Li>
          <Li><strong>Email</strong> — Your registered email address.</Li>
          <Li><strong>Role</strong> — Your role with a color-coded badge and description of what it means.</Li>
          <Li><strong>Inviter Group</strong> — The group you belong to (for Directors and Organizers).</Li>
          <Li><strong>Member Since</strong> — When your account was created.</Li>
          <Li><strong>Account Status</strong> — Active or Inactive.</Li>
        </Ul>
        <Screenshot name="profile-info" caption="Profile page — your account information" />

        <H3><Lock className="w-5 h-5 text-indigo-500" /> Change Password</H3>
        <P>
          Below your account info, the "Change Password" section lets you update your password.
        </P>
        <StepList steps={[
          'Enter your Current Password.',
          'Enter a New Password that meets ALL requirements (shown below).',
          'Confirm the new password by typing it again in the Confirm Password field.',
          'Password requirement indicators turn green as you meet each one.',
          'Click "Change Password" to save.',
          'A success toast confirms the change.',
        ]} />
        <P><strong>Password Requirements:</strong></P>
        <Ul>
          <Li>At least <strong>8 characters</strong> long.</Li>
          <Li>At least one <strong>uppercase letter</strong> (A-Z).</Li>
          <Li>At least one <strong>lowercase letter</strong> (a-z).</Li>
          <Li>At least one <strong>number</strong> (0-9).</Li>
        </Ul>
        <P>
          Each requirement has a visual indicator that turns from red ✗ to green ✓ as you type.
          The "Change Password" button is only enabled when all requirements are met and both password fields match.
        </P>
        <Screenshot name="profile-password" caption="Change password — requirements validated in real-time" />

        <H3>Application Maintenance</H3>
        <P>At the bottom of the Profile page, two utility buttons are available:</P>
        <Ul>
          <Li><strong>Check for Updates</strong> — Checks if a newer version of the app is available. If a service worker update is found, it activates the new version and reloads the page. If no update is available, a toast informs you that you're on the latest version.</Li>
          <Li><strong>Clear Cached Data</strong> — Clears all locally cached application data (service worker caches and browser caches). This can resolve issues with stale data or UI glitches. The page reloads after clearing.</Li>
        </Ul>
        <Screenshot name="profile-maintenance" caption="Application maintenance — check for updates and clear cache" />

        <Tip>If the app behaves unexpectedly after an update, try "Clear Cached Data" to force-refresh all assets.</Tip>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PUBLIC PAGES                                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Section id="public-pages" icon={Globe} title="Public Pages (No Login Required)">
        <P>
          These three pages are accessible by anyone with the link — <strong>no login required</strong>.
          They are designed for guests, check-in operators, and event monitors.
        </P>

        {/* ── PORTAL ── */}
        <H3><QrCode className="w-5 h-5 text-indigo-500" /> Attendance Confirmation Portal</H3>
        <P>
          The Portal page allows invited guests to confirm or decline their attendance.
          Share this URL with invitees along with their invitation code.
        </P>
        <P><strong>URL:</strong> <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">/portal</code></P>

        <P><strong>Two lookup modes:</strong></P>
        <Ul>
          <Li><strong>Use Code</strong> — Guest enters their unique invitation code (received via email, SMS, or printed invitation).</Li>
          <Li><strong>Use Phone</strong> — Guest enters their phone number. If multiple invitations exist for the same phone, they are listed for selection.</Li>
        </Ul>
        <P>Toggle between modes using the <strong>"Use Code"</strong> / <strong>"Use Phone"</strong> buttons.</P>
        <Screenshot name="portal-code" caption="Portal — enter invitation code or phone number" />

        <P><strong>Guest Confirmation Flow:</strong></P>
        <StepList steps={[
          'Guest enters their invitation code or phone number and clicks "Verify".',
          'If valid, the guest sees their event details: Event Name, Date, Venue, their Name, Inviter, and Guest Allowance.',
          'Guest clicks "I\'ll Attend" to confirm, or "Can\'t Attend" to decline.',
          'If confirming, guest can specify how many guests they are bringing (0 up to their allowance).',
          'A confirmation message appears thanking them for their response.',
          'Guest can change their response later by visiting the portal again with the same code.',
        ]} />
        <Screenshot name="portal-details" caption="Portal — event details shown after verification" />
        <Screenshot name="portal-confirm" caption="Portal — confirm attendance and specify guest count" />

        <P><strong>Already Checked In:</strong></P>
        <P>
          If the guest has already been checked in at the event, the portal shows a
          <strong> "You're Checked In!"</strong> message with a green checkmark, and no further action is needed.
        </P>
        <Screenshot name="portal-checked-in" caption="Portal — guest already checked in message" />

        <P><strong>Check Another Code:</strong></P>
        <P>
          After confirming, a "Check Another Code" button lets the guest verify a different invitation
          without refreshing the page.
        </P>

        {/* ── CHECK-IN CONSOLE ── */}
        <H3><Search className="w-5 h-5 text-indigo-500" /> Check-in Console</H3>
        <P>
          The Check-in Console is used by the event staff at the door to check in arriving guests.
          It's a standalone page with a dark theme, optimized for quick operation on a tablet or phone.
        </P>
        <P><strong>URL:</strong> <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">/checkin/{'<event-code>'}</code></P>
        <P>The Admin generates this URL from the Events page (Check-in Settings) and shares it with the door team.</P>

        <P><strong>Step 1: Enter the PIN</strong></P>
        <StepList steps={[
          'Open the Check-in Console URL in a browser.',
          'A PIN entry screen appears showing the event name.',
          'Enter the 6-digit PIN (provided by the Admin).',
          'Click "Verify PIN" to access the console.',
          'If the PIN is incorrect, an error message is shown.',
        ]} />
        <Screenshot name="checkin-pin" caption="Check-in Console — enter the 6-digit event PIN" />

        <P><strong>Step 2: Search for Attendees</strong></P>
        <P>After PIN verification, the full console loads with:</P>
        <Ul>
          <Li><strong>Event header</strong> — Shows event name and venue.</Li>
          <Li><strong>Statistics bar</strong> — Real-time counts: Checked In, Total Arrived (invitees + guests), and Remaining.</Li>
          <Li><strong>Search bar</strong> — Type to search attendees by name, phone, invitation code, or inviter.</Li>
          <Li><strong>"Show checked in" toggle</strong> — Check this box to include already-checked-in attendees in the search results.</Li>
        </Ul>
        <Screenshot name="checkin-search" caption="Check-in Console — search for attendees by name, phone, or code" />

        <P><strong>Step 3: Check In a Guest</strong></P>
        <StepList steps={[
          'Search for the guest by name, phone, code, or inviter.',
          'The matching attendee card appears showing their name, inviter, company, and guest allowance.',
          'If the attendee has a guest allowance, select how many guests they are bringing (0 to max).',
          'Click the "Check In" button on the attendee card.',
          'A success animation confirms the check-in.',
          'The attendee card changes to show "Checked In" with a green badge and timestamp.',
        ]} />
        <Screenshot name="checkin-checkin" caption="Check-in Console — check in a guest with optional guest count" />

        <P><strong>Undo a Check-in</strong></P>
        <P>
          If a check-in was done by mistake, toggle "Show checked in" to find the guest,
          then click <strong>"Undo Check-in"</strong> on their card to revert them to not checked in.
        </P>

        <P><strong>Recent Check-ins Feed</strong></P>
        <P>
          The right side of the console (or below on mobile) shows a <strong>live feed</strong> of
          recently checked-in guests with their name, company, guest count, and check-in time.
          This updates in real-time.
        </P>
        <Screenshot name="checkin-recent" caption="Recent check-ins feed — live list of arrivals" />

        <P><strong>Theme Toggle & Logout</strong></P>
        <Ul>
          <Li><strong>Theme toggle</strong> — Switch between light and dark mode using the sun/moon icon in the header.</Li>
          <Li><strong>Logout</strong> — Click "Logout" to exit the console and return to the PIN entry screen.</Li>
        </Ul>

        <InfoBox>
          If the Admin regenerates or deactivates the PIN while you're using the console,
          your session is automatically invalidated and you'll be returned to the PIN entry screen.
        </InfoBox>

        {/* ── LIVE DASHBOARD ── */}
        <H3><BarChart3 className="w-5 h-5 text-indigo-500" /> Live Dashboard</H3>
        <P>
          The Live Dashboard is a real-time public display page showing event attendance statistics.
          It's designed to be projected on a screen at the venue so everyone can see the event's progress.
          It has a dark theme with large, easy-to-read numbers.
        </P>
        <P><strong>URL:</strong> <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">/live/{'<event-code>'}</code></P>

        <P><strong>Auto-Refresh:</strong></P>
        <P>
          The dashboard automatically refreshes every <strong>10 seconds</strong>. A "Live" button
          in the header shows the auto-refresh status with a spinning icon. Click it to pause/resume auto-refresh.
        </P>

        <P><strong>Information Displayed:</strong></P>
        <P>The dashboard shows the following in large, color-coded cards:</P>
        <Ul>
          <Li><Badge color="green">Total Arrived</Badge> — Combined count of checked-in invitees + their guests. The largest number on the dashboard.</Li>
          <Li><Badge color="blue">Invitees Checked In</Badge> — How many individual invitees have been checked in, out of total expected, with a percentage.</Li>
          <Li><Badge color="yellow">Not Yet Arrived</Badge> — Confirmed guests who haven't checked in yet.</Li>
          <Li><Badge color="purple">Expected Total</Badge> — Total expected attendees (invitees + expected guests).</Li>
        </Ul>
        <Screenshot name="live-dashboard-stats" caption="Live Dashboard — main statistics cards with large numbers" />

        <P><strong>Secondary Panels:</strong></P>
        <Ul>
          <Li><strong>Confirmation Status</strong> — Breakdown of confirmed coming, not coming, and no response, with a response rate percentage.</Li>
          <Li><strong>Capacity Overview</strong> — Three progress bars showing: approved invitations (baseline), check-in progress, and guest arrival rate.</Li>
          <Li><strong>Recent Arrivals</strong> — A live feed of recently checked-in guests with their name, company, guest count, and check-in time. Each entry has a green pulsing dot.</Li>
        </Ul>
        <Screenshot name="live-dashboard-panels" caption="Live Dashboard — confirmation status, capacity, and recent arrivals" />

        <P><strong>Event Info Header:</strong></P>
        <P>
          Shows the event name, status badge (<Badge color="green">In Progress</Badge> or <Badge color="blue">Upcoming</Badge>),
          start date/time, venue (if set), and last updated time.
        </P>

        <P><strong>Error State:</strong></P>
        <P>
          If an invalid event code is used, the page shows "Event Not Found" with the invalid code displayed.
        </P>
        <Screenshot name="live-dashboard" caption="Live Dashboard — full view with all panels" />
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TIPS & BEST PRACTICES                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Section id="tips" icon={Lightbulb} title="Tips & Best Practices">
        {roleHas(viewRole, ['organizer', 'admin']) && (
          <>
            <H3><Users className="w-5 h-5 text-blue-500" /> For Organizers</H3>
            <Ul>
              <Li>Use <strong>bulk import</strong> for large guest lists — download the template, fill it in Excel, and upload. It's much faster than adding contacts one by one.</Li>
              <Li>If an invitee is rejected, click the <strong>red ✗ icon</strong> to read the rejection reason, then <strong>resubmit</strong> by selecting the contact and clicking "Submit for Approval" again.</Li>
              <Li>Keep your <strong>Contacts tab</strong> up to date — contacts persist across events, so maintaining accurate data saves time for future events.</Li>
              <Li>Watch the <strong>quota bar</strong> on the Events tab — submit invitees early before your group's allocated slots run out.</Li>
              <Li>Use the <strong>search and filter tools</strong> to quickly find specific invitees by name, status, or inviter.</Li>
              <Li>Check the <strong>Dashboard</strong> regularly to see the status breakdown of your submissions (pending, approved, rejected).</Li>
            </Ul>
          </>
        )}
        {roleHas(viewRole, ['director', 'admin']) && (
          <>
            <H3><CheckSquare className="w-5 h-5 text-emerald-500" /> For Directors</H3>
            <Ul>
              <Li>Review <strong>pending approvals regularly</strong> — Organizers are waiting on your decision and may have deadlines.</Li>
              <Li>Use <strong>bulk approve/reject</strong> for large batches — select multiple invitees with checkboxes, then approve or reject all at once.</Li>
              <Li>Always provide a <strong>clear reason when rejecting</strong> — it helps the Organizer understand what to fix if they want to resubmit.</Li>
              <Li><strong>Export reports</strong> before the event to share attendance numbers with stakeholders and management.</Li>
              <Li>Use the <strong>Approved tab</strong> to review all approved invitees and cancel any approvals if needed.</Li>
              <Li>Check the <strong>Reports page</strong> for summary views by group or inviter to understand submission patterns.</Li>
            </Ul>
          </>
        )}
        {isViewAdmin && (
          <>
            <H3><Shield className="w-5 h-5 text-purple-500" /> For Admins</H3>
            <Ul>
              <Li>Set up the <strong>organizational structure first</strong>: create Inviter Groups → create Inviters → create User accounts → create Events.</Li>
              <Li>Set <strong>group quotas</strong> on events before Organizers start submitting — this prevents over-submission and ensures fair distribution.</Li>
              <Li>Generate the <strong>check-in PIN</strong> well before the event day — share the Console URL and PIN with the door team in advance.</Li>
              <Li>Share the <strong>Live Dashboard URL</strong> with event coordinators — it can be projected on screens at the venue.</Li>
              <Li>Monitor the <strong>Activity Log</strong> regularly to track all system actions and audit who did what and when.</Li>
              <Li>Upload your organization's <strong>logo in Export Settings</strong> — it makes all exported reports (PDF, Excel, Print) look professional.</Li>
              <Li>Use <strong>auto-deactivate</strong> on check-in PINs to automatically disable access after the event ends.</Li>
              <Li>Use the <strong>Admin Import</strong> feature on the Contacts tab to import contacts across all groups from a single spreadsheet.</Li>
            </Ul>
          </>
        )}
        <H3><Lightbulb className="w-5 h-5 text-amber-500" /> For Everyone</H3>
        <Ul>
          <Li>Use <strong>dark mode</strong> for low-light environments — toggle via the sun/moon icon in the header. Your preference is saved automatically.</Li>
          <Li>Use the <strong>search bar</strong> on every page — it searches across all visible columns for fast lookup.</Li>
          <Li>Click <strong>column headers</strong> in any table to sort by that column. Click again to reverse the sort order.</Li>
          <Li>On <strong>mobile devices</strong>, swipe tables horizontally to see all columns. Tap ☰ to open the sidebar.</Li>
          <Li>The app works as a <strong>Progressive Web App (PWA)</strong> — on Android, you can install it as a native app from the browser menu.</Li>
          <Li>If the app feels slow or shows stale data, go to <strong>Profile → Clear Cached Data</strong> to force a fresh reload.</Li>
          <Li>Use the <strong>export feature</strong> on any data table to download as Excel, CSV, PDF, or print a hard copy.</Li>
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
