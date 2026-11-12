// A label with the word that says why the field is flagged ("Required", "Not set"), beside the coloured border.
export function Label({ htmlFor, note, children }) {
  return <label htmlFor={htmlFor}>{children}{note && <span className={`field-note ${note === 'Required' ? 'required' : ''}`}>{note}</span>}</label>;
}

export function CellWarning({ id, raw, message }) {
  return (
    <p id={id} className="warning" hidden={raw === null}>
      {raw === null ? '' : `${message}: "${raw}". Typing in the fields above replaces it.`}
    </p>
  );
}
