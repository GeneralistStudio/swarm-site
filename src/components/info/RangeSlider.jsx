import './RangeSlider.css';

// A labelled slider for the Data panel's "Controls" (Year, Time of day …):
// the label and the current value across the top, the line with its handle and
// end labels, a little tick marking the "normal" value, and a RESET button.
// Look + feel: RangeSlider.css.
//
//   label        the name shown top-left ("Year")
//   value        the current value; onChange(newNumber) when it moves
//   min / max / step
//   format       how a value is written as text (default: just the number)
//   startLabel / endLabel   the text at each end of the line (default: min / max)
//   mark         where to draw the little tick (e.g. "today"), if anywhere
//   onReset      what RESET does;  resetDisabled greys it out
//   gradient     paint the line as the day's colors instead of plain (Time of day)
export default function RangeSlider({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format = String,
  startLabel = format(min),
  endLabel = format(max),
  mark,
  onReset,
  resetDisabled = false,
  gradient = false,
}) {
  const fraction = (v) => (v - min) / (max - min);
  const inputId = `range-slider-${id}`;

  return (
    <div
      className={gradient ? 'range-slider range-slider--gradient' : 'range-slider'}
      style={{ '--p': fraction(value), '--today': mark == null ? 0 : fraction(mark) }}
    >
      <div className="range-slider__head">
        <label className="range-slider__label" htmlFor={inputId}>
          {label}
        </label>
        <output className="range-slider__value" htmlFor={inputId}>
          {format(value)}
        </output>
      </div>

      <div className="range-slider__row">
        <span className="range-slider__end">{startLabel}</span>

        <div className="range-slider__track">
          <input
            id={inputId}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          {mark != null && <span className="range-slider__now" aria-hidden="true" />}
        </div>

        <span className="range-slider__end">{endLabel}</span>
      </div>

      <button type="button" className="range-slider__reset" onClick={onReset} disabled={resetDisabled}>
        Reset
      </button>
    </div>
  );
}
