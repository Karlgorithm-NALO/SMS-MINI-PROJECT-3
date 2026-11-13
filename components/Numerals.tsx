import { Fragment } from "react";

const NUMBER = /(\d[\d,.]*\d|\d)/;

/**
 * Gives every number inside a sentence tabular figures and a little weight,
 * e.g. the amounts in "Needs GHS 100.00, but only GHS 59.25 is left.", so
 * figures in running text still line up and read as figures.
 */
export default function Numerals({ text }: { text: string }) {
  return (
    <>
      {text.split(NUMBER).map((part, index) =>
        index % 2 === 1 ? (
          <span key={index} className="font-medium tabular-nums text-ink-body">
            {part}
          </span>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}
