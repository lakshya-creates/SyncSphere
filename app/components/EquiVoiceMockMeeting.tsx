import {
  AlertTriangle,
  Languages,
  MessageSquareText,
  Mic,
  Sparkles,
  User,
  Video,
} from "lucide-react";

type Participant = {
  name: string;
  active?: boolean;
};

const participants: Participant[] = [
  { name: "Sarah", active: true },
  { name: "Kenji" },
  { name: "Alex" },
  { name: "Priya" },
];

export default function EquiVoiceMockMeeting() {
  return (
    <div className="grid gap-4 xl:grid-cols-10">
      <section className="xl:col-span-7 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {participants.map((participant) => (
            <article
              key={participant.name}
              className={`rounded-xl border p-3 ${
                participant.active
                  ? "border-sky-300 bg-sky-50 shadow-[0_10px_28px_-20px_rgba(14,116,144,0.55)]"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="h-24 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 p-3 sm:h-28">
                <div className="flex h-full items-center justify-center rounded-md border border-slate-300/70 bg-white/60">
                  <User className="h-8 w-8 text-slate-500" />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{participant.name}</p>
                {participant.active ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                    <Mic className="h-3 w-3" />
                    Active Speaker
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600">
                    <Video className="h-3 w-3" />
                    Listening
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-slate-600" />
            <p className="text-sm font-semibold text-slate-900">Live Transcript (Localized)</p>
          </div>
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-900">Let&apos;s not boil the ocean on this deployment.</p>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Languages className="h-3.5 w-3.5" />
              Azure AI Translator - Japanese
            </div>
            <p className="text-sm text-sky-800">???????????????????????</p>
          </div>
        </div>
      </section>

      <aside className="xl:col-span-3 space-y-4">
        <article className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            <p className="text-sm font-semibold text-amber-900">Inclusivity Nudge</p>
          </div>
          <p className="text-sm text-amber-900">Kenji hasn&apos;t spoken in 12 minutes.</p>
          <button
            type="button"
            className="mt-3 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-left text-xs font-medium text-amber-900 transition hover:bg-amber-100"
          >
            Prompt: Kenji, how does this impact the global timeline?
          </button>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-sky-600" />
            <p className="text-sm font-semibold text-slate-900">Jargon Buster</p>
          </div>
          <p className="text-sm font-medium text-slate-900">Jargon Detected: &quot;Boil the ocean&quot;</p>
          <p className="mt-2 text-sm text-slate-600">
            Meaning: To make a task unnecessarily difficult or broad in scope.
          </p>
        </article>
      </aside>
    </div>
  );
}

