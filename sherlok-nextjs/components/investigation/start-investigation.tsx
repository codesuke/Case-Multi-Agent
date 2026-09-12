"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  FileText,
  LoaderCircle,
  Paperclip,
  Play,
  Settings2,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  asSafeTransportFailure,
  asStartedInvestigation,
} from "@/lib/investigation-contract";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const supportedExtensions = ["txt", "md", "docx", "pdf"];
const providers = { gemini: "Gemini", openai: "OpenAI", groq: "Groq" } as const;

type Provider = keyof typeof providers;
type Source = { file: File; id: string; name: string; kind: string };
type SubmissionError = { message: string; recoveryAction: string };

export function StartInvestigation() {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<Source[]>([]);
  const [rejectedFiles, setRejectedFiles] = useState<Source[]>([]);
  const [provider, setProvider] = useState<Provider>("gemini");
  const [starting, setStarting] = useState(false);
  const [submissionError, setSubmissionError] = useState<SubmissionError | null>(
    null,
  );
  const picker = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const ready = Boolean(text.trim() || files.length);

  function addFiles(items: FileList | null) {
    if (!items || starting) return;

    const selected = Array.from(items).map(toSource);
    const accepted = selected.filter((file) =>
      supportedExtensions.includes(file.kind.toLowerCase()),
    );
    const rejected = selected.filter(
      (file) => !supportedExtensions.includes(file.kind.toLowerCase()),
    );

    setFiles((previous) => [...previous, ...accepted]);
    setRejectedFiles((previous) => [...previous, ...rejected]);
  }

  async function begin() {
    if (!ready) return;
    setStarting(true);
    setSubmissionError(null);

    const material = new FormData();
    material.set("pasted_material", text);
    material.set("provider", provider);
    files.forEach(({ file }) => material.append("files", file, file.name));

    try {
      const response = await fetch("/api/investigations", {
        method: "POST",
        body: material,
      });
      const result: unknown = await response.json();
      const started = asStartedInvestigation(result);
      if (response.ok && started) {
        router.push(
          `/agent-workspace?investigation_id=${encodeURIComponent(started.investigation_id)}`,
        );
        return;
      }
      setSubmissionError(safeSubmissionError(result));
    } catch {
      setSubmissionError({
        message: "The investigation could not be started.",
        recoveryAction: "Check your connection and try again.",
      });
    } finally {
      setStarting(false);
    }
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#24160e] text-[#f8ebd2]">
      <div className="paper-noise pointer-events-none fixed inset-0" />
      <div className="relative grid min-h-[100dvh] lg:grid-cols-[23rem_minmax(0,1fr)]">
        <Intro />
        <section className="bg-[#2b1a10] p-3 sm:p-5 lg:py-8 lg:pr-8 lg:pl-0">
          <div className="min-h-full rounded-xl border border-[#d8c4a0] bg-[#fbf2de] p-3 text-[#1e2831] shadow-[0_18px_44px_rgba(14,7,3,.24)] sm:p-5 lg:p-5 xl:p-6">
            <div className="grid gap-4">
              <MaterialPanel
                text={text}
                starting={starting}
                onTextChange={setText}
              />
              <FilesPanel
                files={files}
                rejectedFiles={rejectedFiles}
                picker={picker}
                starting={starting}
                onAddFiles={addFiles}
                onRemoveFile={(id) =>
                  setFiles((items) => items.filter((item) => item.id !== id))
                }
                onRemoveRejected={(id) =>
                  setRejectedFiles((items) =>
                    items.filter((item) => item.id !== id),
                  )
                }
              />
              <SettingsPanel
                provider={provider}
                starting={starting}
                onProviderChange={setProvider}
              />
              <ActionPanel
                ready={ready}
                starting={starting}
                submissionError={submissionError}
                onStart={begin}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MaterialPanel({
  text,
  starting,
  onTextChange,
}: {
  text: string;
  starting: boolean;
  onTextChange: (value: string) => void;
}) {
  return (
    <section
      className="rounded-lg border border-[#d8c4a0] bg-[#f7ead3]/70 p-4 sm:p-5"
      aria-labelledby="paste-material-heading"
    >
      <PanelHeading
        icon={<FileText />}
        id="paste-material-heading"
        title="Paste case material"
        meta="Add a summary or key questions (optional)"
      />
      <label className="sr-only" htmlFor="case-material">
        Paste case material
      </label>
      <Textarea
        id="case-material"
        className="mt-4 min-h-32 resize-y border-[#d8c4a0] bg-[#fff9ed] text-[#1e2831] placeholder:text-[#746b60] focus:border-[#18afa3] focus:ring-[#18afa3]/25 lg:min-h-36"
        disabled={starting}
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        placeholder="Paste case notes, documents, or questions here…"
      />
      <p className="mt-2 text-xs leading-5 text-[#5c5145]">
        Pasted text and files can be investigated together.
      </p>
    </section>
  );
}

function FilesPanel({
  files,
  rejectedFiles,
  picker,
  starting,
  onAddFiles,
  onRemoveFile,
  onRemoveRejected,
}: {
  files: Source[];
  rejectedFiles: Source[];
  picker: React.RefObject<HTMLInputElement | null>;
  starting: boolean;
  onAddFiles: (items: FileList | null) => void;
  onRemoveFile: (id: string) => void;
  onRemoveRejected: (id: string) => void;
}) {
  return (
    <section
      className="rounded-lg border border-[#d8c4a0] bg-[#f7ead3]/70 p-4 sm:p-5"
      aria-labelledby="add-files-heading"
    >
      <PanelHeading
        icon={<Paperclip />}
        id="add-files-heading"
        title="Add case files"
        meta="Supported formats: PDF, DOCX, MD, TXT"
      />
      <input
        ref={picker}
        className="sr-only"
        type="file"
        multiple
        accept=".txt,.md,.docx,.pdf"
        onChange={(event) => {
          onAddFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={starting}
        onClick={() => picker.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onAddFiles(event.dataTransfer.files);
        }}
        className="group mt-4 flex min-h-28 w-full flex-col items-center justify-center rounded-lg border border-dashed border-[#a79476] bg-[#fff9ed]/60 px-5 text-center transition hover:border-[#18afa3] hover:bg-[#d5f0e8]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18afa3] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Upload
          className="mb-2 size-6 text-[#24160e] transition-transform group-hover:-translate-y-0.5"
          strokeWidth={1.8}
        />
        <span className="text-sm font-semibold text-[#24160e]">
          Drag and drop files here
        </span>
        <span className="mt-1 text-sm text-[#008b82]">or click to browse</span>
      </button>
      <AnimatePresence initial={false}>
        {(files.length > 0 || rejectedFiles.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-3 space-y-2"
            aria-live="polite"
          >
            {files.map((file) => (
              <SourceRow
                file={file}
                key={file.id}
                starting={starting}
                onRemove={onRemoveFile}
              />
            ))}
            {rejectedFiles.map((file) => (
              <RejectedSourceRow
                file={file}
                key={file.id}
                onRemove={onRemoveRejected}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function SettingsPanel({
  provider,
  starting,
  onProviderChange,
}: {
  provider: Provider;
  starting: boolean;
  onProviderChange: (provider: Provider) => void;
}) {
  return (
    <section
      className="rounded-lg border border-[#d8c4a0] bg-[#f7ead3]/70 px-4 sm:px-5"
      aria-labelledby="run-settings-heading"
    >
      <Accordion type="single" collapsible>
        <AccordionItem value="settings" className="border-0">
          <AccordionTrigger className="py-4 font-serif text-xl font-semibold text-[#1e2831] hover:no-underline">
            <span className="flex items-center gap-3">
              <Settings2 className="size-5" strokeWidth={1.8} />
              <span id="run-settings-heading">Run settings</span>
            </span>
            <span className="ml-auto mr-3 font-sans text-sm font-normal text-[#5c5145]">
              {providers[provider]}
            </span>
          </AccordionTrigger>
          <AccordionContent className="text-[#5c5145]">
            <div className="grid gap-4 border-t border-[#d8c4a0] py-4 md:grid-cols-[minmax(0,390px)_1fr] md:items-end md:gap-12">
              <label className="block text-sm font-medium text-[#5c5145]">
                Investigation provider
                <Select
                  value={provider}
                  onValueChange={(value) => onProviderChange(value as Provider)}
                  disabled={starting}
                >
                  <SelectTrigger className="mt-2 border-[#d8c4a0] bg-[#fff9ed] text-[#1e2831] focus:ring-[#18afa3]/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[#745022] bg-[#382315]">
                    <SelectItem value="gemini">Gemini</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="groq">Groq</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <div className="flex gap-3 border-t border-[#d8c4a0] pt-4 text-xs leading-5 md:border-l md:border-t-0 md:pl-8 md:pt-0">
                <ShieldCheck
                  className="mt-0.5 size-5 shrink-0 text-[#24160e]"
                  strokeWidth={1.8}
                />
                <p>
                  Only supplied participant material is investigated. Image-only
                  and scanned PDFs need OCR and cannot be processed after
                  curation.
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}

function ActionPanel({
  ready,
  starting,
  submissionError,
  onStart,
}: {
  ready: boolean;
  starting: boolean;
  submissionError: SubmissionError | null;
  onStart: () => void;
}) {
  return (
    <section aria-label="Start investigation">
      {!ready && (
        <p className="mb-3 text-sm text-[#745022]">
          Add usable material to begin.
        </p>
      )}
      <Button
        className="w-full text-base"
        disabled={!ready || starting}
        onClick={onStart}
      >
        {starting ? (
          <>
            <LoaderCircle className="size-4 animate-spin" />
            Preparing case file…
          </>
        ) : (
          <>
            <Play className="size-4" fill="currentColor" />
            Start investigation
          </>
        )}
      </Button>
      {starting && (
        <div
          className="mt-3 flex items-center gap-3 text-sm text-[#5c5145]"
          role="status"
        >
          <LoaderCircle className="size-4 animate-spin text-[#008b82]" />
          Sending supplied material to case-file curation…
        </div>
      )}
      {submissionError && (
        <div
          className="mt-3 flex gap-3 rounded-lg border border-[#d99a48] bg-[#f6e0bc] px-4 py-3 text-sm text-[#783f14]"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <p>
            <b className="block">{submissionError.message}</b>
            {submissionError.recoveryAction}
          </p>
        </div>
      )}
    </section>
  );
}

function SourceRow({
  file,
  starting,
  onRemove,
}: {
  file: Source;
  starting: boolean;
  onRemove: (id: string) => void;
}) {
  return (
    <motion.div
      layout
      className="flex items-center gap-3 rounded-lg border border-[#d8c4a0] bg-[#fff9ed] px-4 py-2.5"
    >
      <FileText className="size-6 shrink-0 text-[#24160e]" strokeWidth={1.7} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#1e2831]">
          {file.name}
        </p>
        <p className="mt-0.5 text-xs text-[#5c5145]">{file.kind}</p>
      </div>
      <span className="hidden items-center gap-2 text-sm text-[#008b82] sm:flex">
        <Check className="size-4 rounded-full bg-[#008b82] p-0.5 text-[#fff9ed]" />
        Added
      </span>
      <button
        type="button"
        onClick={() => onRemove(file.id)}
        disabled={starting}
        className="rounded p-2 text-[#745022] hover:bg-[#f6deaa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18afa3]"
        aria-label={`Remove ${file.name}`}
      >
        <Trash2 className="size-4" />
      </button>
    </motion.div>
  );
}

function RejectedSourceRow({
  file,
  onRemove,
}: {
  file: Source;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-[#d99a48] bg-[#f6e0bc] px-4 py-3 text-sm text-[#783f14]">
      <AlertTriangle className="mt-0.5 size-5 shrink-0" />
      <p className="flex-1">
        <b>{file.name}</b> can’t be used. Add a plain-text, Markdown, DOCX, or
        text-based PDF version.
      </p>
      <button
        type="button"
        className="self-start rounded p-1 hover:bg-[#f0ce94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18afa3]"
        aria-label={`Dismiss ${file.name} error`}
        onClick={() => onRemove(file.id)}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

function PanelHeading({
  icon,
  id,
  title,
  meta,
}: {
  icon: React.ReactNode;
  id: string;
  title: string;
  meta: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-[#24160e]">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-5">
          <h2
            className="font-serif text-[1.4rem] font-semibold leading-tight text-[#1e2831]"
            id={id}
          >
            {title}
          </h2>
          <p className="text-sm text-[#746b60]">{meta}</p>
        </div>
      </div>
    </div>
  );
}

function Intro() {
  const steps = [
    ["Add material", "Paste notes or upload files"],
    ["Watch agents", "See the investigation progress"],
    ["Review proposal", "Get a clear, evidence-based answer"],
  ];
  return (
    <aside className="relative overflow-hidden bg-[#24160e] px-8 py-9 sm:px-12 sm:py-10 lg:px-12 lg:py-9">
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(#f4b941_.75px,transparent_.75px)] [background-size:16px_16px]" />
      <div className="relative flex min-h-full flex-col">
        <div>
          <span className="font-serif text-5xl font-semibold leading-none tracking-tight text-[#f8ebd2]">
            Sherlok
          </span>
          <p className="mt-2 text-sm text-[#d8c4a0]">
            AI agents for deeper answers
          </p>
        </div>
        <div className="my-8 h-px bg-[#745022]" />
        <div>
          <h1 className="max-w-[290px] font-serif text-5xl font-semibold leading-[.98] tracking-tight text-[#f8ebd2]">
            Start an investigation
          </h1>
          <p className="mt-5 max-w-[285px] text-base leading-6 text-[#d8c4a0]">
            Give Sherlok your case material and let a team of AI agents analyze,
            connect, and reason across the facts.
          </p>
        </div>
        <ol className="mt-9 space-y-6 border-l border-[#b89b6e] pl-11">
          {steps.map(([title, description], index) => (
            <li key={title} className="relative">
              <span
                className={`absolute -left-[3.65rem] top-0 grid size-10 place-items-center rounded-full border text-lg font-semibold ${index === 0 ? "border-[#f4b941] bg-[#f4b941] text-[#24160e]" : "border-[#d8c4a0] bg-[#24160e] text-[#f8ebd2]"}`}
              >
                {index + 1}
              </span>
              <p
                className={`font-serif text-lg ${index === 0 ? "text-[#f4b941]" : "text-[#f8ebd2]"}`}
              >
                {title}
              </p>
              <p className="mt-0.5 text-sm text-[#d8c4a0]">{description}</p>
            </li>
          ))}
        </ol>
        <div className="mt-auto hidden border-t border-[#745022] pt-7 lg:block">
          <div className="rounded-lg border border-[#745022] bg-[#382315]/45 p-5 font-serif text-xl italic leading-7 text-[#d8c4a0]">
            Different perspectives.
            <br />A clearer picture.
            <div className="mt-4 h-0.5 w-12 bg-[#f4b941]" />
          </div>
        </div>
      </div>
    </aside>
  );
}

function toSource(file: File): Source {
  const kind = file.name.split(".").pop()?.toUpperCase() ?? "FILE";
  return {
    file,
    id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
    name: file.name,
    kind,
  };
}

function safeSubmissionError(value: unknown): SubmissionError {
  const failure = asSafeTransportFailure(value);
  if (failure) {
    return {
      message: failure.detail.message,
      recoveryAction: failure.detail.recovery_action,
    };
  }
  return {
    message: "The investigation could not be started.",
    recoveryAction: "Review the supplied material and try again.",
  };
}
