import { type ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  ArrowRight,
  BadgeAlert,
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  FileCheck2,
  Flag,
  Gauge,
  Landmark,
  LockKeyhole,
  Megaphone,
  PanelLeft,
  Scale,
  ShieldAlert,
  Target,
  Users,
  Vote as VoteIcon,
  X,
  Zap,
} from 'lucide-react';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

export type Phase = 'landing' | 'briefing' | 'budget' | 'negotiation' | 'election' | 'confidence' | 'vote' | 'ending';
export type GroupId = 'A' | 'B' | 'C' | 'D';
export type GameAction = { type: string; payload?: unknown };

export type MissionMatignonCallbacks = {
  onPhaseChange?: (phase: Phase) => void;
  onAction?: (action: GameAction) => void;
};

type Group = {
  id: GroupId;
  title: string;
  subtitle: string;
  seats: number;
  color: string;
  icon: ReactNode;
  demand: string;
  leverage: string;
  offers: { label: string; detail: string; effect: string; seats: number; tone: 'good' | 'warn' | 'neutral' }[];
};

const groups: Group[] = [
  {
    id: 'A',
    title: 'Groupe A',
    subtitle: 'Les bâtisseurs',
    seats: 128,
    color: '44 96% 62%',
    icon: <Landmark size={18} />,
    demand: 'Investir dans les usines et les infrastructures.',
    leverage: '128 sièges',
    offers: [
      { label: 'Plan d’investissement', detail: '3,2 Md€ pour l’industrie et les infrastructures.', effect: '+6 soutien', seats: 128, tone: 'good' },
      { label: 'Clause de revoyure', detail: 'Une commission de suivi au printemps.', effect: '+3 soutien', seats: 70, tone: 'neutral' },
      { label: 'Tenir la ligne', detail: 'Pas de nouvelle dépense.', effect: '-4 soutien', seats: 0, tone: 'warn' },
    ],
  },
  {
    id: 'B',
    title: 'Groupe B',
    subtitle: 'Les vigies sociales',
    seats: 158,
    color: '166 48% 49%',
    icon: <Scale size={18} />,
    demand: 'Protéger les ménages les plus fragiles.',
    leverage: '158 sièges',
    offers: [
      { label: 'Bouclier ciblé', detail: 'Aider les ménages qui en ont le plus besoin.', effect: '+7 soutien', seats: 158, tone: 'good' },
      { label: 'Conférence sociale', detail: 'Organiser une discussion sans argent en plus.', effect: '+2 soutien', seats: 87, tone: 'neutral' },
      { label: 'Rester ferme', detail: 'Ne pas créer de nouvelle aide cette année.', effect: '-6 soutien', seats: 0, tone: 'warn' },
    ],
  },
  {
    id: 'C',
    title: 'Groupe C',
    subtitle: 'Les territoires',
    seats: 141,
    color: '201 78% 67%',
    icon: <Target size={18} />,
    demand: 'Donner plus de moyens aux territoires en difficulté.',
    leverage: '141 sièges',
    offers: [
      { label: 'Contrats territoriaux', detail: '1,1 Md€ pour les bassins fragiles.', effect: '+5 soutien', seats: 141, tone: 'good' },
      { label: 'Garantie de méthode', detail: 'Un accord de principe sans budget dédié.', effect: '+1 soutien', seats: 78, tone: 'neutral' },
      { label: 'Demander un effort', detail: 'Les collectivités devront faire avec moins.', effect: '-5 soutien', seats: 0, tone: 'warn' },
    ],
  },
  {
    id: 'D',
    title: 'Groupe D',
    subtitle: 'Les gardiens du cap',
    seats: 150,
    color: '4 70% 60%',
    icon: <ShieldAlert size={18} />,
    demand: 'Réduire la dette sans perdre le cap.',
    leverage: '150 sièges',
    offers: [
      { label: 'Économie structurelle', detail: 'Réduire les dépenses progressivement.', effect: '+5 soutien', seats: 150, tone: 'good' },
      { label: 'Garantie sur le déficit', detail: 'Promettre un objectif clair, sans nouvelle mesure.', effect: '+2 soutien', seats: 83, tone: 'neutral' },
      { label: 'Garder le texte', detail: 'Ne rien changer au budget actuel.', effect: '-3 soutien', seats: 0, tone: 'warn' },
    ],
  },
];

const phaseLabels: Record<Phase, string> = {
  landing: 'Accueil',
  briefing: 'Briefing',
  budget: 'Préparation',
  negotiation: 'Négociations',
  election: 'Contexte',
  confidence: 'Censure',
  vote: 'Vote final',
  ending: 'Verdict',
};
const phaseOrder: Phase[] = ['briefing', 'budget', 'negotiation', 'election', 'confidence', 'vote', 'ending'];
const TOTAL_SEATS = 577;
const MAJORITY_SEATS = 289;

function seatsForOffer(groupId: GroupId, offerIndex: number | undefined) {
  if (offerIndex === undefined) return 0;
  return groups.find((group) => group.id === groupId)?.offers[offerIndex]?.seats ?? 0;
}

function supportChange(offerIndex: number) {
  return offerIndex === 0 ? 4 : offerIndex === 1 ? 1 : -3;
}

function Metric({ label, value, suffix, tone = 'default', icon }: { label: string; value: string | number; suffix?: string; tone?: 'default' | 'good' | 'danger'; icon?: ReactNode }) {
  const colors = tone === 'good' ? 'text-[hsl(var(--accent))]' : tone === 'danger' ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--foreground))]';
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="hidden size-8 shrink-0 items-center justify-center border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] sm:flex">{icon}</div>
      <div className="min-w-0">
        <p className="font-mono text-[9px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">{label}</p>
        <p className={`font-mono text-sm font-medium ${colors}`}>{value}{suffix && <span className="ml-1 text-[10px] text-[hsl(var(--muted-foreground))]">{suffix}</span>}</p>
      </div>
    </div>
  );
}

function Button({ children, onClick, variant = 'primary', disabled = false, className = '', testId }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; disabled?: boolean; className?: string; testId: string }) {
  const styles = {
    primary: 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:brightness-105',
    secondary: 'border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]',
    ghost: 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]',
    danger: 'border border-[hsl(var(--destructive)/.5)] bg-[hsl(var(--destructive)/.12)] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.2)]',
  };
  return <button data-testid={testId} type="button" disabled={disabled} onClick={onClick} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-4 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${className}`}>{children}</button>;
}

function ProgressRail({ phase }: { phase: Phase }) {
  const currentIndex = phaseOrder.indexOf(phase);
  return (
    <aside className="hidden w-64 shrink-0 border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))] p-5 lg:block">
      <div className="mb-10 flex items-center gap-3">
        <div className="relative flex size-9 items-center justify-center border border-[hsl(var(--primary)/.65)] bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]">
          <Landmark size={18} strokeWidth={1.7} />
          <span className="absolute -right-1 -top-1 size-2 bg-[hsl(var(--primary))]" />
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[.22em] text-[hsl(var(--primary))]">République · 2027</p>
          <p className="font-serif text-lg text-[hsl(var(--foreground))]">Mission Matignon</p>
        </div>
      </div>
      <div className="mb-8 border-l border-[hsl(var(--border))] pl-4">
        <p className="font-mono text-[9px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">Dossier confidentiel</p>
        <p className="mt-2 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">Préparer. Convaincre. Résister.</p>
      </div>
      <nav aria-label="Progression de la mission" className="space-y-1">
        {phaseOrder.map((item, index) => {
          const reached = currentIndex >= index;
          const active = phase === item;
          return (
            <div key={item} className={`relative flex items-center gap-3 px-3 py-3 text-xs transition ${active ? 'bg-[hsl(var(--primary)/.11)] text-[hsl(var(--primary))]' : reached ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
              <span className={`flex size-5 items-center justify-center border font-mono text-[10px] ${active ? 'border-[hsl(var(--primary))]' : reached ? 'border-[hsl(var(--accent)/.6)] text-[hsl(var(--accent))]' : 'border-[hsl(var(--border))]'}`}>{reached && !active ? <Check size={11} /> : String(index + 1).padStart(2, '0')}</span>
              <span>{phaseLabels[item]}</span>
              {active && <span className="absolute bottom-0 left-0 top-0 w-0.5 bg-[hsl(var(--primary))]" />}
            </div>
          );
        })}
      </nav>
      <div className="mt-auto pt-12">
        <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
          <div className="mb-2 flex items-center gap-2 text-[hsl(var(--muted-foreground))]"><LockKeyhole size={13} /><span className="font-mono text-[9px] uppercase tracking-[.14em]">Canal sécurisé</span></div>
          <p className="font-mono text-[10px] text-[hsl(var(--muted-foreground))]">MAT-27 / SESSION ACTIVE</p>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ phase, support, risk, seatsFor }: { phase: Phase; support: number; risk: number; seatsFor: number }) {
  return (
    <header className="sticky top-0 z-10 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/.94)] px-4 py-3 backdrop-blur-md sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-3 lg:hidden">
          <div className="flex size-8 items-center justify-center border border-[hsl(var(--primary)/.6)] text-[hsl(var(--primary))]"><Landmark size={16} /></div>
          <span className="font-serif text-base">Mission Matignon</span>
        </div>
        <div className="hidden items-center gap-2 text-xs text-[hsl(var(--muted-foreground))] sm:flex"><span className="font-mono uppercase tracking-[.13em]">Session 01</span><ChevronRight size={13} /><span>{phaseLabels[phase]}</span></div>
        <div className="ml-auto flex items-center gap-4 sm:gap-7">
          <Metric label="Soutien" value={support} suffix="/ 100" tone={support < 40 ? 'danger' : support > 62 ? 'good' : 'default'} icon={<Users size={14} />} />
          <Metric label="Voix sûres" value={seatsFor} suffix="/ 577" tone={seatsFor >= 289 ? 'good' : 'default'} icon={<VoteIcon size={14} />} />
          <Metric label="Risque de censure" value={risk} suffix="%" tone={risk > 58 ? 'danger' : 'default'} icon={<ShieldAlert size={14} />} />
        </div>
      </div>
    </header>
  );
}

function Landing({ onStart }: { onStart: () => void }) {
  return (
    <main className="relative flex min-h-[100dvh] items-center overflow-hidden bg-[hsl(var(--background))] grid-lines">
      <div className="absolute right-[-12vw] top-[-10vw] size-[55vw] rounded-full bg-[hsl(var(--primary)/.08)] blur-3xl" />
      <div className="absolute bottom-[-25vw] left-[-10vw] size-[42vw] rounded-full bg-[hsl(var(--accent)/.06)] blur-3xl" />
      <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-5 py-12 sm:px-10 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:gap-20 lg:px-16">
        <div className="animate-rise-in">
          <div className="mb-8 flex items-center gap-3"><div className="flex size-11 items-center justify-center border border-[hsl(var(--primary)/.65)] bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"><Landmark size={21} /></div><div><p className="font-mono text-[10px] uppercase tracking-[.28em] text-[hsl(var(--primary))]">République française</p><p className="font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Dossier de crise · 2027</p></div></div>
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[.3em] text-[hsl(var(--muted-foreground))]">Simulation politique</p>
          <h1 className="max-w-3xl font-serif text-[clamp(3.5rem,9vw,7.8rem)] leading-[.84] tracking-[-.045em] text-[hsl(var(--foreground))]">Mission<br /><span className="text-[hsl(var(--primary))]">Matignon</span></h1>
          <p className="mt-8 max-w-xl text-base leading-relaxed text-[hsl(var(--muted-foreground))] sm:text-lg">Vous dirigez le gouvernement. Dans quelques semaines, l’Assemblée votera votre budget 2027. Pour le faire passer, vous devrez convaincre des groupes qui n’ont pas tous les mêmes priorités.</p>
          <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center"><Button testId="button-start-mission" onClick={onStart} className="group min-w-52">Entrer en session <ArrowRight size={17} className="transition group-hover:translate-x-1" /></Button><span className="font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Durée · 8 à 12 min</span></div>
        </div>
        <div className="animate-rise-in [animation-delay:120ms]">
          <div className="relative border border-[hsl(var(--border))] bg-[hsl(var(--card)/.72)] p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-7">
            <div className="absolute right-0 top-0 h-px w-1/2 bg-[hsl(var(--primary))]" />
            <div className="mb-8 flex items-center justify-between"><p className="font-mono text-[10px] uppercase tracking-[.2em] text-[hsl(var(--primary))]">Note de situation</p><span className="flex items-center gap-1.5 font-mono text-[9px] text-[hsl(var(--muted-foreground))]"><span className="size-1.5 animate-pulse-soft bg-[hsl(var(--accent))]" /> ACTIF</span></div>
            <div className="space-y-5">
              {[['01', 'Le budget', 'Il faut trouver 11 milliards d’économies.'], ['02', 'Le Parlement', 'Quatre groupes. Pas de majorité.'], ['03', 'Le risque', 'Chaque accord peut changer le résultat.']].map(([num, title, body]) => <div key={num} className="flex gap-4 border-t border-[hsl(var(--border))] pt-4"><span className="font-mono text-[10px] text-[hsl(var(--primary))]">{num}</span><div><p className="font-semibold text-[hsl(var(--foreground))]">{title}</p><p className="mt-1 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{body}</p></div></div>)}
            </div>
            <div className="mt-8 flex items-center justify-between border-t border-[hsl(var(--border))] pt-4"><span className="font-mono text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">Accès direct</span><span className="font-mono text-xs text-[hsl(var(--foreground))]">MAT-27 / 01</span></div>
          </div>
        </div>
      </div>
    </main>
  );
}

function ScreenTitle({ eyebrow, title, intro, icon }: { eyebrow: string; title: string; intro: string; icon: ReactNode }) {
  return <div className="mb-8 flex gap-4 animate-rise-in"><div className="mt-1 flex size-10 shrink-0 items-center justify-center border border-[hsl(var(--primary)/.5)] bg-[hsl(var(--primary)/.08)] text-[hsl(var(--primary))]">{icon}</div><div><p className="font-mono text-[10px] uppercase tracking-[.22em] text-[hsl(var(--primary))]">{eyebrow}</p><h2 className="mt-2 font-serif text-4xl leading-none tracking-[-.025em] text-[hsl(var(--foreground))] sm:text-5xl">{title}</h2><p className="mt-4 max-w-2xl text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{intro}</p></div></div>;
}

function Briefing({ onContinue }: { onContinue: () => void }) {
  return <div className="mx-auto max-w-5xl"><ScreenTitle eyebrow="Étape 01 · briefing" title="Votre mission." intro="Le Président vous laisse peu de temps. Il faut préparer un budget crédible et trouver assez de voix à l’Assemblée." icon={<BookOpen size={19} />} /><div className="grid gap-4 md:grid-cols-3">{[['Objectif', 'Faire adopter le budget 2027.', <Flag size={18} />], ['À trouver', '11 milliards d’économies.', <BarChart3 size={18} />], ['Danger', 'Une motion de censure est possible.', <BadgeAlert size={18} />]].map(([title, body, icon], index) => <div key={String(title)} className={`border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 animate-rise-in [animation-delay:${index * 80}ms]`}><div className="mb-8 flex size-9 items-center justify-center bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">{icon}</div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">{title}</p><p className="mt-2 text-sm leading-relaxed text-[hsl(var(--foreground))]">{body}</p></div>)}</div><div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-[hsl(var(--border))] pt-6 sm:flex-row sm:items-center"><p className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]"><CircleHelp size={14} /> Vous pourrez encore réfléchir avant le vote.</p><Button testId="button-open-budget" onClick={onContinue}>Préparer le budget <ArrowRight size={16} /></Button></div></div>;
}

function Budget({ budget, onBudgetChange, onContinue }: { budget: { defense: number; transition: number; social: number }; onBudgetChange: (key: keyof typeof budget, value: number) => void; onContinue: () => void }) {
  const total = budget.defense + budget.transition + budget.social;
  return <div className="mx-auto max-w-5xl"><ScreenTitle eyebrow="Étape 02 · arbitrage" title="Donnez une forme au cap." intro="Trois enveloppes structurent votre budget. Les curseurs sont des arbitrages politiques, pas de simples lignes comptables." icon={<BarChart3 size={19} />} /><div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sm:p-7"><div className="mb-7 flex items-end justify-between border-b border-[hsl(var(--border))] pb-4"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">Répartition proposée</p><p className="mt-1 font-serif text-2xl">Dépenses prioritaires</p></div><span className="font-mono text-sm text-[hsl(var(--primary))]">{total} Md€</span></div><div className="space-y-7">{([['defense', 'Souveraineté & sécurité', 'Renforcer les moyens régaliens.'], ['transition', 'Transition productive', 'Transformer sans casser l’appareil industriel.'], ['social', 'Cohésion sociale', 'Protéger les foyers les plus exposés.']] as const).map(([key, label, detail]) => <label key={key} className="block"><div className="mb-2 flex items-start justify-between gap-3"><div><span className="text-sm font-semibold">{label}</span><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{detail}</p></div><span className="font-mono text-sm text-[hsl(var(--primary))]">{budget[key]} Md€</span></div><input data-testid={`input-budget-${key}`} aria-label={label} type="range" min="2" max="10" value={budget[key]} onChange={(event) => onBudgetChange(key, Number(event.target.value))} className="h-1.5 w-full cursor-pointer accent-[hsl(var(--primary))]" /></label>)}</div></div><div className="border border-[hsl(var(--border))] bg-[hsl(var(--sidebar))] p-5 sm:p-7"><div className="flex items-center justify-between"><p className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">Lecture politique</p><Gauge size={17} className="text-[hsl(var(--primary))]" /></div><div className="mt-8 space-y-6"><div><div className="mb-2 flex justify-between text-xs"><span>Crédibilité financière</span><span className="font-mono text-[hsl(var(--accent))]">{Math.max(38, 82 - Math.abs(total - 18) * 8)}%</span></div><div className="h-1.5 bg-[hsl(var(--secondary))]"><div className="h-full bg-[hsl(var(--accent))] transition-all" style={{ width: `${Math.max(38, 82 - Math.abs(total - 18) * 8)}%` }} /></div></div><div><div className="mb-2 flex justify-between text-xs"><span>Acceptabilité sociale</span><span className="font-mono text-[hsl(var(--primary))]">{Math.min(96, 46 + budget.social * 5)}%</span></div><div className="h-1.5 bg-[hsl(var(--secondary))]"><div className="h-full bg-[hsl(var(--primary))] transition-all" style={{ width: `${Math.min(96, 46 + budget.social * 5)}%` }} /></div></div><div className="border-l-2 border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.07)] p-3 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">Une enveloppe trop généreuse est populaire aujourd’hui. Elle sera une faiblesse demain, autour de la table.</div></div></div></div><div className="mt-7 flex justify-end"><Button testId="button-lock-budget" onClick={onContinue}>Verrouiller les arbitrages <LockKeyhole size={15} /></Button></div></div>;
}

function Negotiation({ negotiated, selectedGroup, seatsFor, onSelectGroup, onChoose, onContinue }: { negotiated: Partial<Record<GroupId, number>>; selectedGroup: GroupId; seatsFor: number; onSelectGroup: (id: GroupId) => void; onChoose: (group: GroupId, offer: number) => void; onContinue: () => void }) {
  const group = groups.find((item) => item.id === selectedGroup) ?? groups[0];
  const allDone = Object.keys(negotiated).length === groups.length;
  return <div className="mx-auto max-w-6xl"><ScreenTitle eyebrow="Étape 03 · négociations" title="Convaincre les groupes." intro="Chaque groupe a une demande. À vous de choisir jusqu’où vous êtes prêt à aller." icon={<Users size={19} />} /><div className="mb-5 grid gap-3 sm:grid-cols-3"><div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"><p className="font-mono text-[9px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Voix sûres</p><p className="mt-2 font-mono text-2xl text-[hsl(var(--primary))]">{seatsFor}<span className="ml-1 text-sm text-[hsl(var(--muted-foreground))]">/ 577</span></p></div><div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"><p className="font-mono text-[9px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Majorité</p><p className="mt-2 font-mono text-2xl text-[hsl(var(--accent))]">289<span className="ml-1 text-sm text-[hsl(var(--muted-foreground))]">voix</span></p></div><div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"><p className="font-mono text-[9px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Reste à trouver</p><p className="mt-2 font-mono text-2xl text-[hsl(var(--foreground))]">{Math.max(0, 289 - seatsFor)}<span className="ml-1 text-sm text-[hsl(var(--muted-foreground))]">voix</span></p></div></div><div className="grid gap-5 lg:grid-cols-[.72fr_1.28fr]"><div className="space-y-2">{groups.map((item) => { const done = negotiated[item.id] !== undefined; return <button data-testid={`button-group-${item.id}`} type="button" key={item.id} onClick={() => onSelectGroup(item.id)} className={`flex w-full items-center gap-3 border p-4 text-left transition ${selectedGroup === item.id ? 'border-[hsl(var(--primary)/.7)] bg-[hsl(var(--primary)/.08)]' : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--muted-foreground)/.5)]'}`}><span className="flex size-9 shrink-0 items-center justify-center border" style={{ color: `hsl(${item.color})`, borderColor: `hsl(${item.color} / .45)` }}>{item.icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{item.title}</span><span className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">{item.seats} sièges · {item.subtitle}</span></span>{done ? <span className="flex size-5 items-center justify-center rounded-full bg-[hsl(var(--accent)/.16)] text-[hsl(var(--accent))]"><Check size={12} /></span> : <ChevronRight size={15} className="text-[hsl(var(--muted-foreground))]" />}</button> })}</div><div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sm:p-7"><div className="mb-6 flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] pb-5"><div><p className="font-mono text-[10px] uppercase tracking-[.18em]" style={{ color: `hsl(${group.color})` }}>{group.title} · {group.subtitle}</p><p className="mt-3 max-w-xl font-serif text-2xl leading-tight">{group.demand}</p></div><span className="shrink-0 border border-[hsl(var(--border))] px-2 py-1 font-mono text-[9px] uppercase text-[hsl(var(--muted-foreground))]">{group.leverage}</span></div><p className="mb-3 text-xs text-[hsl(var(--muted-foreground))]">Quel compromis êtes-vous prêt à accepter ?</p><div className="space-y-2">{group.offers.map((offer, index) => <button data-testid={`button-offer-${group.id}-${index}`} type="button" key={offer.label} onClick={() => onChoose(group.id, index)} className={`group flex w-full items-center justify-between gap-4 border p-4 text-left transition ${negotiated[group.id] === index ? 'border-[hsl(var(--accent)/.7)] bg-[hsl(var(--accent)/.08)]' : 'border-[hsl(var(--border))] bg-[hsl(var(--background)/.34)] hover:border-[hsl(var(--primary)/.65)]'}`}><span><span className="flex items-center gap-2 text-sm font-semibold">{offer.label}{negotiated[group.id] === index && <Check size={14} className="text-[hsl(var(--accent))]" />}</span><span className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">{offer.detail}</span></span><span className="flex shrink-0 flex-col items-end gap-1 font-mono text-[10px]"><span className={offer.tone === 'good' ? 'text-[hsl(var(--accent))]' : offer.tone === 'warn' ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--muted-foreground))]'}>{offer.effect}</span><span className="text-[hsl(var(--muted-foreground))]">{offer.seats} voix</span></span></button>)}</div><div className="mt-6 flex items-center justify-between border-t border-[hsl(var(--border))] pt-5"><span className="font-mono text-[10px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">{allDone ? 'Tous les groupes ont répondu' : `${Object.keys(negotiated).length} / 4 groupes rencontrés`}</span><Button testId="button-continue-negotiation" onClick={onContinue} disabled={!allDone}>Voir la suite <ArrowRight size={15} /></Button></div></div></div></div>;
}

function Election({ onContinue }: { onContinue: () => void }) {
  return <div className="mx-auto max-w-4xl"><ScreenTitle eyebrow="Étape 04 · événement" title="Le pays regarde déjà ailleurs." intro="À l’approche de l’élection présidentielle, une déclaration enflamme l’opinion. Le Président exige que le budget soit adopté avant que la campagne n’aspire tout l’oxygène." icon={<Megaphone size={19} />} /><div className="relative overflow-hidden border border-[hsl(var(--primary)/.38)] bg-[hsl(var(--primary)/.06)] p-6 sm:p-9"><div className="absolute right-0 top-0 h-full w-1/3 bg-[linear-gradient(135deg,transparent_40%,hsl(var(--primary)/.06)_40%)]" /><div className="relative"><div className="mb-8 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]"><span className="size-1.5 bg-[hsl(var(--primary))]" /> Flash politique · 07:42</div><blockquote className="max-w-2xl font-serif text-3xl leading-tight sm:text-4xl">« Le gouvernement doit choisir : tenir parole ou tenir encore quelques jours. »</blockquote><p className="mt-6 max-w-xl text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">La cote de confiance recule de 4 points en une matinée. Les groupes alliés demandent des garanties. Votre fenêtre de tir se referme.</p><div className="mt-8 grid gap-3 sm:grid-cols-3"><div className="border border-[hsl(var(--border))] bg-[hsl(var(--background)/.42)] p-3"><p className="font-mono text-[9px] uppercase text-[hsl(var(--muted-foreground))]">Calendrier</p><p className="mt-2 font-mono text-sm">J - 21</p></div><div className="border border-[hsl(var(--border))] bg-[hsl(var(--background)/.42)] p-3"><p className="font-mono text-[9px] uppercase text-[hsl(var(--muted-foreground))]">Opinion</p><p className="mt-2 font-mono text-sm text-[hsl(var(--destructive))]">Sous tension</p></div><div className="border border-[hsl(var(--border))] bg-[hsl(var(--background)/.42)] p-3"><p className="font-mono text-[9px] uppercase text-[hsl(var(--muted-foreground))]">Prochaine étape</p><p className="mt-2 font-mono text-sm">Décision</p></div></div></div></div><div className="mt-7 flex justify-end"><Button testId="button-face-confidence" onClick={onContinue}>Réunir le conseil <ArrowRight size={15} /></Button></div></div>;
}

function Confidence({ onChoose }: { onChoose: (choice: 'vote' | '493') => void }) {
  return <div className="mx-auto max-w-5xl"><ScreenTitle eyebrow="Étape 05 · choix constitutionnel" title="Le moment de vérité." intro="Votre budget n’a pas de majorité naturelle. Deux chemins s’ouvrent. Dans les deux cas, vous devrez vivre avec les conséquences." icon={<Zap size={19} />} /><div className="grid gap-5 md:grid-cols-2"><button data-testid="button-confidence-vote" type="button" onClick={() => onChoose('vote')} className="group border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 text-left transition hover:-translate-y-1 hover:border-[hsl(var(--accent)/.7)] hover:bg-[hsl(var(--accent)/.05)]"><div className="mb-10 flex items-center justify-between"><div className="flex size-10 items-center justify-center bg-[hsl(var(--accent)/.13)] text-[hsl(var(--accent))]"><VoteIcon size={19} /></div><ArrowRight size={17} className="text-[hsl(var(--muted-foreground))] transition group-hover:translate-x-1" /></div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--accent))]">Option A · vote direct</p><h3 className="mt-2 font-serif text-3xl">Chercher les voix</h3><p className="mt-3 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">Vous soumettez le texte tel quel. Une défaite est publique, mais une victoire consolide votre mandat.</p><div className="mt-6 border-t border-[hsl(var(--border))] pt-4 font-mono text-[10px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">Risque élevé · légitimité forte</div></button><button data-testid="button-confidence-493" type="button" onClick={() => onChoose('493')} className="group border border-[hsl(var(--primary)/.5)] bg-[hsl(var(--primary)/.06)] p-6 text-left transition hover:-translate-y-1 hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/.1)]"><div className="mb-10 flex items-center justify-between"><div className="flex size-10 items-center justify-center bg-[hsl(var(--primary)/.14)] text-[hsl(var(--primary))]"><FileCheck2 size={19} /></div><ArrowRight size={17} className="text-[hsl(var(--muted-foreground))] transition group-hover:translate-x-1" /></div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--primary))]">Option B · article 49.3</p><h3 className="mt-2 font-serif text-3xl">Engager la responsabilité</h3><p className="mt-3 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">Le texte est adopté sans vote, sauf motion de censure. Vous gagnez du temps et offrez une cible à vos adversaires.</p><div className="mt-6 border-t border-[hsl(var(--border))] pt-4 font-mono text-[10px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">Risque politique · efficacité immédiate</div></button></div></div>;
}

function Vote({ choice, onFinish }: { choice: 'vote' | '493'; onFinish: (success: boolean) => void }) {
  const [selected, setSelected] = useState<'hold' | 'amend' | null>(null);
  return <div className="mx-auto max-w-4xl"><ScreenTitle eyebrow="Étape 06 · assemblée" title={choice === '493' ? 'La motion est déposée.' : 'Les portes se ferment.'} intro={choice === '493' ? 'Le recours à l’article 49.3 a déclenché une motion de censure. Dernière chance : rassurer les indécis sans renier vos engagements.' : 'Le scrutin est lancé. Une dernière prise de parole peut faire basculer les voix qui hésitent encore.'} icon={<VoteIcon size={19} />} /><div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[hsl(var(--border))] pb-5"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">Dernière consigne</p><p className="mt-2 font-serif text-2xl">Quelle ligne tenez-vous ?</p></div><span className="border border-[hsl(var(--destructive)/.5)] bg-[hsl(var(--destructive)/.1)] px-3 py-2 font-mono text-[10px] uppercase text-[hsl(var(--destructive))]">Vote imminent</span></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><button data-testid="button-final-hold" type="button" onClick={() => setSelected('hold')} className={`border p-5 text-left transition ${selected === 'hold' ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.08)]' : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/.5)]'}`}><div className="flex items-center justify-between"><span className="font-semibold">Tenir le texte</span>{selected === 'hold' && <Check size={16} className="text-[hsl(var(--primary))]" />}</div><p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">Ne pas ajouter de promesse à la dernière minute. La cohérence a aussi une valeur.</p></button><button data-testid="button-final-amend" type="button" onClick={() => setSelected('amend')} className={`border p-5 text-left transition ${selected === 'amend' ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.08)]' : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/.5)]'}`}><div className="flex items-center justify-between"><span className="font-semibold">Dernier amendement</span>{selected === 'amend' && <Check size={16} className="text-[hsl(var(--primary))]" />}</div><p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">Offrir une clause de contrôle aux groupes qui n’ont pas encore basculé.</p></button></div><div className="mt-7 flex flex-col items-center justify-between gap-4 border-t border-[hsl(var(--border))] pt-5 sm:flex-row"><p className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]"><ShieldAlert size={14} className="text-[hsl(var(--destructive))]" /> Ce choix sera inscrit au procès-verbal.</p><Button testId="button-submit-final-vote" onClick={() => onFinish(selected === 'amend')} disabled={!selected} variant={choice === '493' ? 'danger' : 'primary'}>{choice === '493' ? 'Affronter la motion' : 'Lancer le vote'} <ArrowRight size={15} /></Button></div></div></div>;
}

function Ending({ success, support, onRestart }: { success: boolean; support: number; onRestart: () => void }) {
  return <div className="mx-auto max-w-4xl text-center"><div className={`mx-auto mb-7 flex size-16 items-center justify-center border ${success ? 'border-[hsl(var(--accent)/.7)] bg-[hsl(var(--accent)/.1)] text-[hsl(var(--accent))]' : 'border-[hsl(var(--destructive)/.7)] bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]'}`}>{success ? <Check size={28} /> : <X size={28} />}</div><p className={`font-mono text-[10px] uppercase tracking-[.25em] ${success ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--destructive))]'}`}>{success ? 'Mission accomplie · session 01' : 'Motion adoptée · session 01'}</p><h2 className="mt-4 font-serif text-5xl leading-none tracking-[-.03em] sm:text-7xl">{success ? 'Le budget tient.' : 'Le gouvernement tombe.'}</h2><p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{success ? 'Le texte est adopté. Rien n’est réglé, mais la République dispose d’un budget et vous avez gardé la main sur le calendrier.' : 'Le budget n’a pas passé l’épreuve. Les concessions n’ont pas suffi — ou sont arrivées trop tard. Une autre session vous attend.'}</p><div className="mx-auto mt-10 grid max-w-lg grid-cols-2 border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-left"><div className="border-r border-[hsl(var(--border))] p-4"><p className="font-mono text-[9px] uppercase text-[hsl(var(--muted-foreground))]">Soutien final</p><p className="mt-2 font-mono text-xl text-[hsl(var(--primary))]">{support}<span className="ml-1 text-xs text-[hsl(var(--muted-foreground))]">/ 100</span></p></div><div className="p-4"><p className="font-mono text-[9px] uppercase text-[hsl(var(--muted-foreground))]">Statut</p><p className={`mt-2 font-mono text-sm ${success ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--destructive))]'}`}>{success ? 'ADOPTÉ' : 'CENSURE'}</p></div></div><div className="mt-8"><Button testId="button-restart-mission" onClick={onRestart} variant="secondary"><Zap size={15} /> Rejouer la session</Button></div></div>;
}

export function MissionMatignon({ callbacks }: { callbacks?: MissionMatignonCallbacks }) {
  const [phase, setPhase] = useState<Phase>('landing');
  const [support, setSupport] = useState(48);
  const [risk, setRisk] = useState(54);
  const [budget, setBudget] = useState({ defense: 6, transition: 7, social: 5 });
  const [negotiated, setNegotiated] = useState<Partial<Record<GroupId, number>>>({});
  const [selectedGroup, setSelectedGroup] = useState<GroupId>('A');
  const [confidenceChoice, setConfidenceChoice] = useState<'vote' | '493'>('vote');
  const [success, setSuccess] = useState(false);
  const updatePhase = (next: Phase) => { setPhase(next); callbacks?.onPhaseChange?.(next); };
  const act = (action: GameAction, next?: Phase) => { callbacks?.onAction?.(action); if (next) updatePhase(next); };
  if (phase === 'landing') return <Landing onStart={() => act({ type: 'start' }, 'briefing')} />;
  const changeBudget = (key: keyof typeof budget, value: number) => { setBudget((old) => ({ ...old, [key]: value })); callbacks?.onAction?.({ type: 'budget-change', payload: { key, value } }); };
  const seatsFor = Object.entries(negotiated).reduce((total, [groupId, offer]) => total + seatsForOffer(groupId as GroupId, offer), 0);
  const chooseOffer = (group: GroupId, offer: number) => {
    setNegotiated((old) => ({ ...old, [group]: offer }));
    setSupport((old) => {
      const previousOffer = negotiated[group];
      const nextSupport = old - (previousOffer === undefined ? 0 : supportChange(previousOffer)) + supportChange(offer);
      return Math.max(0, Math.min(100, nextSupport));
    });
    setRisk((old) => {
      const previousOffer = negotiated[group];
      const previousRisk = previousOffer === undefined ? 0 : previousOffer === 2 ? 5 : -1;
      const nextRisk = offer === 2 ? 5 : -1;
      return Math.max(0, Math.min(100, old - previousRisk + nextRisk));
    });
    act({ type: 'negotiation', payload: { group, offer, seats: seatsForOffer(group, offer) } });
  };
  const finishVote = (wasAmendment: boolean) => {
    const finalSeats = Math.min(TOTAL_SEATS, seatsFor + (wasAmendment ? 30 : 0));
    const won = finalSeats >= MAJORITY_SEATS;
    setSuccess(won);
    act({ type: 'final-vote', payload: { won, choice: confidenceChoice, wasAmendment, finalSeats } }, 'ending');
  };
  return <div className="noise-bg min-h-[100dvh] bg-[hsl(var(--background))]"><div className="flex min-h-[100dvh]"><ProgressRail phase={phase} /><div className="min-w-0 flex-1"><Topbar phase={phase} support={support} risk={risk} seatsFor={seatsFor} /><main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-12"><div key={phase} className="animate-fade-in">{phase === 'briefing' && <Briefing onContinue={() => act({ type: 'briefing-complete' }, 'budget')} />}{phase === 'budget' && <Budget budget={budget} onBudgetChange={changeBudget} onContinue={() => act({ type: 'budget-locked', payload: budget }, 'negotiation')} />}{phase === 'negotiation' && <Negotiation negotiated={negotiated} selectedGroup={selectedGroup} seatsFor={seatsFor} onSelectGroup={setSelectedGroup} onChoose={chooseOffer} onContinue={() => act({ type: 'negotiations-complete' }, 'election')} />}{phase === 'election' && <Election onContinue={() => act({ type: 'context-acknowledged' }, 'confidence')} />}{phase === 'confidence' && <Confidence onChoose={(choice) => { setConfidenceChoice(choice); act({ type: 'confidence-choice', payload: choice }, 'vote'); }} />}{phase === 'vote' && <Vote choice={confidenceChoice} onFinish={finishVote} />}{phase === 'ending' && <Ending success={success} support={support} onRestart={() => { setSupport(48); setRisk(54); setNegotiated({}); setConfidenceChoice('vote'); setSuccess(false); updatePhase('landing'); }} />}</div></main><footer className="mx-auto flex max-w-7xl items-center justify-between border-t border-[hsl(var(--border))] px-4 py-5 sm:px-6 lg:px-12"><span className="font-mono text-[9px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Mission Matignon · Fiction politique</span><span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]"><PanelLeft size={12} /> Session active</span></footer></div></div></div>;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch><Route path="/" component={() => <MissionMatignon />} /><Route component={NotFound} /></Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;