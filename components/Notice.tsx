import { XCircleIcon } from "./icons";
import Numerals from "./Numerals";

export type Problem = {
  title: string;
  message: string;
  hint?: string; // what this means for the wallet, or what to do next
};

type Props = Problem & {
  className?: string;
};

/** Something went wrong: what happened, and what it means for the wallet. */
export default function Notice({ title, message, hint, className = "" }: Props) {
  return (
    <div role="alert" className={`flex gap-3 rounded-2xl bg-danger-bg/70 px-4 py-3.5 motion-safe:animate-rise-in ${className}`}>
      <XCircleIcon className="mt-0.5 h-[18px] w-[18px] text-danger-fg" />
      <div className="min-w-0 text-sm leading-relaxed text-danger-note">
        <p className="font-semibold text-danger-fg">{title}</p>
        <p className="mt-0.5">
          <Numerals text={message} />
        </p>
        {hint && <p className="mt-1 text-danger-note/80">{hint}</p>}
      </div>
    </div>
  );
}
