/** A collapsed group of cards: the links stay in the HTML, the page stays short. */
export function ConversionGroup({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <details className="faq-item">
      <summary className="faq-question">
        <span>
          {label} <span className="meta">· {count}</span>
        </span>
      </summary>
      <div className="conv-group-body">{children}</div>
    </details>
  );
}
