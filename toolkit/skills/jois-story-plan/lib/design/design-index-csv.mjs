// GENERATED. Do not edit this copy.
// The story index of a design, as the file `<backlog>/design-index.csv` holds it (viewer/shared/guidelines/design-conventions.md):
// one row per acceptance criterion of each designed story, keyed by the story's ID and the criterion's exact text. This module
// reads and writes the file's text and follows story IDs through it (a renumber, a delete, a migration). Pure: no file is read
// or written, so the portal and the story skills use the same code. Columns the code does not know are kept on read and write.

import { parseCsv, toCsv } from '../backlog/csv.mjs';

                                            
                                               

export const DESIGN_INDEX_COLUMNS = ['Story ID', 'Story', 'Criterion', 'Kind', 'Artboards', 'Viewports', 'Canvas']         ;

                                                    

const VIEWPORTS                      = ['desktop', 'mobile'];
const KINDS                           = ['main', 'failure'];
const LIST_SEPARATOR = ';';

                                 
                  
                                                                    
                                                                                
                      
                                             
                        
                                                                                      
                                                                             
 

// A file that cannot be read. `line` is the row of the file (the header is row 1, the first data row is row 2) and `field`
// names the column at fault, so the message tells a person where to look.
export class IndexError extends Error {
  line         ;
  field         ;
  constructor(message        , { line, field }                                    = {}) {
    super(line === undefined ? message : `row ${line}: ${message}`);
    this.name = 'IndexError';
    this.line = line;
    this.field = field;
  }
}

const splitList = (cell        )           =>
  cell
    .split(LIST_SEPARATOR)
    .map((item) => item.trim())
    .filter(Boolean);

const knownColumn = (header        )                     => DESIGN_INDEX_COLUMNS.find((name) => name.toLowerCase() === header.trim().toLowerCase());

// Maps each column's position in the header: the known columns by name, the others as extra columns by their header text.
function readHeader(header          )                                                                        {
  const known = new Map                ();
  const extra                                 = [];
  header.forEach((cell, at) => {
    const column = knownColumn(cell);
    if (!column) {
      if (extra.some((e) => e.name === cell)) throw new IndexError(`column "${cell}" appears twice in the header`, { line: 1, field: cell });
      extra.push({ name: cell, at });
      return;
    }
    if (known.has(column)) throw new IndexError(`column "${column}" appears twice in the header`, { line: 1, field: column });
    known.set(column, at);
  });
  for (const column of DESIGN_INDEX_COLUMNS) {
    if (!known.has(column)) throw new IndexError(`the header has no column "${column}"`, { line: 1, field: column });
  }
  return { known, extra };
}

function requiredText(value        , line        , field        )         {
  if (value.trim() === '') throw new IndexError(`column "${field}" must not be empty`, { line, field });
  return value.trim();
}

function readViewports(cell        , line        )             {
  const viewports             = [];
  for (const item of splitList(cell)) {
    const found = VIEWPORTS.find((known) => known === item);
    if (!found) throw new IndexError(`column "Viewports" must hold desktop, mobile or desktop;mobile (found "${item}")`, { line, field: 'Viewports' });
    if (viewports.includes(found)) throw new IndexError(`column "Viewports" repeats "${found}"`, { line, field: 'Viewports' });
    viewports.push(found);
  }
  if (viewports.length === 0) throw new IndexError('column "Viewports" must hold desktop, mobile or desktop;mobile', { line, field: 'Viewports' });
  return viewports;
}

// Reads the text of a design-index.csv. An empty file holds no rows. Throws an IndexError that names the row and the column at
// fault: a missing or repeated column, an empty Story ID, Criterion or Canvas, a Kind or Viewports value that is not allowed,
// a row with more cells than the header, or a second row for the same story and criterion. A row of empty cells is skipped.
export function parseDesignIndexCsv(text        )                   {
  const table = parseCsv(text);
  if (table.length === 0) return [];
  const { known, extra } = readHeader(table[0]);
  const cellAt = (cells          , column        )         => cells[known.get(column)          ] ?? '';
  const rows                   = [];
  const seen = new Set        ();
  table.slice(1).forEach((cells, i) => {
    const line = i + 2;
    if (cells.every((cell) => cell.trim() === '')) return;
    if (cells.length > table[0].length) throw new IndexError(`the row has ${cells.length} cells and the header has ${table[0].length}`, { line });
    const storyId = requiredText(cellAt(cells, 'Story ID'), line, 'Story ID');
    const criterion = requiredText(cellAt(cells, 'Criterion'), line, 'Criterion');
    const kind = KINDS.find((k) => k === cellAt(cells, 'Kind').trim());
    if (!kind) throw new IndexError('column "Kind" must be "main" or "failure"', { line, field: 'Kind' });
    const key = `${storyId}\n${criterion}`;
    if (seen.has(key)) throw new IndexError(`column "Criterion" repeats a criterion of ${storyId}`, { line, field: 'Criterion' });
    seen.add(key);
    rows.push({
      storyId,
      story: cellAt(cells, 'Story').trim(),
      criterion,
      kind,
      artboards: splitList(cellAt(cells, 'Artboards')),
      viewports: readViewports(cellAt(cells, 'Viewports'), line),
      canvas: requiredText(cellAt(cells, 'Canvas'), line, 'Canvas'),
      extra: Object.fromEntries(extra.map(({ name, at }) => [name, cells[at] ?? ''])),
    });
  });
  return rows;
}

// The file's text: the header, then one row each, with CRLF line endings as the CSV writer gives them. Extra columns come
// after the known ones, in the order they first appear in the rows.
export function serializeDesignIndex(rows                           )         {
  const extraColumns = [...new Set(rows.flatMap((row) => Object.keys(row.extra)))];
  const header = [...DESIGN_INDEX_COLUMNS, ...extraColumns];
  const body = rows.map((row) => [
    row.storyId,
    row.story,
    row.criterion,
    row.kind,
    row.artboards.join(LIST_SEPARATOR),
    row.viewports.join(LIST_SEPARATOR),
    row.canvas,
    ...extraColumns.map((name) => row.extra[name] ?? ''),
  ]);
  return toCsv([header, ...body]);
}

// Rows follow their stories when IDs change: `changes` maps old story ID -> new story ID, and '' means the story is gone, so
// its rows are dropped. Every row is looked up by its old ID once, so a swap of two IDs swaps them and no more. Returns the
// same array when no row names a changed ID, so a caller can tell nothing changed.
export function retargetDesignRows(rows                  , changes                             )                   {
  if (!rows.some((row) => changes.has(row.storyId))) return rows;
  return rows.flatMap((row) => {
    const to = changes.get(row.storyId);
    if (to === undefined) return [row];
    return to === '' ? [] : [{ ...row, storyId: to }];
  });
}

// A migration takes the rows of the stories in `codes` (their IDs in the source) from the source file's rows to the target's.
// The rows keep their IDs as written: the relink that follows the migration renames them in the target's file, as it does
// for moved review rows. The canvas stays on each row. Returns the source rows without the moved ones, the target rows with
// them appended, and how many moved.
export function moveDesignRows(
  source                  ,
  target                  ,
  codes                  ,
)                                                                        {
  const wanted = new Set(codes);
  const moving = source.filter((row) => wanted.has(row.storyId));
  if (moving.length === 0) return { source, target, moved: 0 };
  return { source: source.filter((row) => !wanted.has(row.storyId)), target: [...target, ...moving], moved: moving.length };
}
