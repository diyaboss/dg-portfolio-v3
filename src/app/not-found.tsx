import Link from "next/link";

export const metadata = { title: "404" };

export default function NotFound() {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nf-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/95 px-6"
    >
      <div className="hud-text w-full max-w-[460px] text-[13px] leading-relaxed">
        <p className="text-ember-hot">{"////// 404 — route not found"}</p>
        <h1 id="nf-title" className="mt-4 font-display text-[40px] font-extrabold leading-none tracking-tight text-bone">
          Nothing to exfiltrate here.
        </h1>
        <p className="mt-6 text-bone-dim">
          This path was never part of the perimeter. Fuzzing URLs is a fine hobby, but the only open port is the
          front door.
        </p>
        <pre className="mt-6 text-bone-dim" aria-hidden="true">
          {"$ curl -I /this-page\nHTTP/1.1 404 Not Found\nX-Note: nice try"}
        </pre>
        <Link href="/" className="bracket mt-8 inline-flex text-bone">
          Return to index
        </Link>
      </div>
    </div>
  );
}
