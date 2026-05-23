export default function AdviceModal({ job, advice, onClose }) {
  if (!job) return null;
  return (
    <div
      role="dialog"
      aria-label="AI interview prep"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between">
          <h3 className="text-lg font-semibold">
            Interview prep · {job.role} @ {job.company}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 text-slate-500 hover:bg-slate-100"
            aria-label="close"
          >
            ✕
          </button>
        </div>

        {!advice && <div className="text-slate-500">Generating advice…</div>}

        {advice?.sections && (
          <div className="space-y-4 text-sm text-slate-800">
            <section>
              <h4 className="font-semibold text-slate-900">Likely interview focus</h4>
              <p className="mt-1">{advice.sections.focus}</p>
            </section>
            <section>
              <h4 className="font-semibold text-slate-900">Top questions to rehearse</h4>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {advice.sections.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </section>
            <section>
              <h4 className="font-semibold text-slate-900">Red flags / clarify</h4>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {advice.sections.redFlags.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </section>
            <section className="rounded bg-indigo-50 p-3">
              <h4 className="font-semibold text-indigo-900">🇭🇰 HK-specific tip</h4>
              <p className="mt-1 text-indigo-900">{advice.sections.hkTip}</p>
            </section>
          </div>
        )}

        {advice?.text && (
          <pre className="whitespace-pre-wrap text-sm text-slate-800">{advice.text}</pre>
        )}

        {advice && (
          <div className="mt-4 text-xs text-slate-400">
            provider: {advice.provider}
            {advice.fallbackReason && ` (reason: ${advice.fallbackReason})`}
          </div>
        )}
      </div>
    </div>
  );
}
