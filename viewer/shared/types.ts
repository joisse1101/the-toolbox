// The data shapes the server, the browser and the story skills share. Each one comes from the parser that builds it
// (see the module named beside it); a type used by one module only stays in that module.

// ---------- backlog (backlog/model.ts, backlog/story-text.ts) ----------

export interface Criterion {
  given: string;
  when: string;
  then: string;
}

// One question and its answer in the Clarifications cell; an empty answer is an open question.
export interface Clarification {
  q: string;
  a: string;
}

export interface Story {
  id: number; // internal, never saved
  cells: string[]; // every cell of the row, so columns the tool does not know round-trip
  code: string; // story ID, '' until the story has an epic (a proposed story holds NEW-<n>)
  dependsOn: string[];
  ambiguous: string[]; // dependsOn entries that named an ID several stories held in the loaded file
  epic: string;
  codedEpic: string; // the epic the ID was last computed for
  feature: string;
  title: string;
  asA: string;
  iWant: string;
  soThat: string;
  points: string;
  notes: string;
  benched: boolean; // proposed stories only
  frozen: boolean;
  criteria: Criterion[];
  rawUserStory: string | null; // original cell text when it did not follow the syntax
  rawCriteria: string | null;
  clarifications: Clarification[];
  rawClarifications: string | null;
}

// A story of the proposals file: the same shape, with a placeholder code `NEW-<n>`.
export type Proposal = Story;

// What serializeBacklog writes.
export interface Backlog {
  headers: string[];
  stories: Story[];
  hasBom: boolean;
}

// What loadBacklog returns: `changed` says the file needs saving (an old column was dropped, or IDs were recomputed).
export interface BacklogFile extends Backlog {
  changed: boolean;
}

// The kinds of file a backlog folder holds (storage/backlog-paths.ts).
export type BacklogKind = 'backlog' | 'review' | 'proposals' | 'lexicon' | 'lexicon-suggestions';

// ---------- review (review/review.ts) ----------

export type ReviewStatus = 'open' | 'applied' | 'dismissed';

export interface ReviewRow {
  storyId: string;
  field: string;
  action: string;
  current: string;
  suggested: string;
  reason: string;
  area: string;
  confidence: 'ready' | 'confirm';
  group: string;
  status: ReviewStatus;
}

// ---------- lexicon (lexicon/lexicon.ts, lexicon/lexicon-suggestions.ts) ----------

export interface LexiconTerm {
  name: string;
  partOf: string;
  definition: string;
  avoid: string[];
  notes: string;
  cells: string[];
}

export interface Lexicon {
  headers: string[];
  hasBom: boolean;
  terms: LexiconTerm[];
}

export type LexiconEditField = 'definition' | 'avoid' | 'notes' | 'partOf';

// The Edit cell of an edit suggestion: for each changed field the value it had and the value it should get.
export type LexiconEdit = Partial<Record<LexiconEditField, { from: string | string[]; to: string | string[] }>>;

export interface LexiconSuggestion {
  term: string;
  action: string; // rename, delete or edit; anything else is kept in the file but is not a suggestion
  newName: string;
  avoid: string[];
  reason: string;
  status: ReviewStatus;
  edit: LexiconEdit | null;
  cells: string[];
}

export interface LexiconSuggestionsFile {
  headers: string[];
  hasBom: boolean;
  rows: LexiconSuggestion[];
  skipped: number;
}

// ---------- project config (backend/storage/project-config.ts) ----------

// A saved project of the list: paths are absolute, and a code base's data folder is `<codeBase>/.plans`.
export interface SavedProject {
  name: string;
  codeBase: string | null;
  dataDir: string;
  synthetic?: boolean; // the active path when the list does not hold it (never written)
}

export interface ProjectConfig {
  projectName: string;
  codeBase: string | null;
  dataDir: string;
  projects: SavedProject[];
  activeProject: number;
  configPath: string;
  exists: boolean;
}

// ---------- API ----------

// The body of an error reply (backend/server.ts).
export interface ApiError {
  error: string;
  code?: string;
}
