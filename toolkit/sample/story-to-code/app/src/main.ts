import './style.css';
import { CATEGORIES, addHabit, loadState, saveState, setCategory, toggleCheck, today, type Category, type State } from './storage';
import { Timer, format } from './timer';

let state: State = loadState(localStorage);
const root = document.querySelector<HTMLDivElement>('#app')!;

const update = (next: State) => {
  state = next;
  saveState(localStorage, state);
  render();
};

const timer = new Timer((remaining) => {
  const el = document.querySelector('#clock');
  if (el) el.textContent = format(remaining);
});

function render() {
  const day = today();
  root.innerHTML = `
    <h1 class="mb-4 text-2xl font-bold">Habit and focus tracker</h1>

    <section class="mb-6 rounded bg-white p-4 shadow">
      <h2 class="mb-2 font-semibold">Habits</h2>
      <ul id="habits" class="mb-3 space-y-1">
        ${state.habits
          .map((h) => `<li><label class="flex items-center gap-2"><input type="checkbox" data-habit="${h.id}" ${h.checks.includes(day) ? 'checked' : ''} /> ${h.name}</label></li>`)
          .join('')}
      </ul>
      <form id="add" class="flex gap-2">
        <input name="name" placeholder="New habit" class="flex-1 rounded border px-2 py-1" />
        <button class="rounded bg-slate-800 px-3 py-1 text-white">Add</button>
      </form>
    </section>

    <section class="rounded bg-white p-4 shadow">
      <h2 class="mb-2 font-semibold">Focus</h2>
      <select id="category" class="mb-3 rounded border px-2 py-1">
        ${CATEGORIES.map((c) => `<option value="${c}" ${c === state.category ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
      <p id="clock" class="mb-3 text-4xl tabular-nums">${format(timer.remaining)}</p>
      <div class="flex gap-2">
        <button id="start" class="rounded bg-emerald-600 px-3 py-1 text-white">Start</button>
        <button id="pause" class="rounded bg-slate-600 px-3 py-1 text-white">Pause</button>
        <button id="reset" class="rounded bg-slate-300 px-3 py-1">Reset</button>
      </div>
    </section>`;

  root.querySelectorAll<HTMLInputElement>('input[data-habit]').forEach((box) =>
    box.addEventListener('change', () => update(toggleCheck(state, box.dataset.habit!, day))),
  );
  root.querySelector<HTMLFormElement>('#add')!.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = (e.target as HTMLFormElement).elements.namedItem('name') as HTMLInputElement;
    update(addHabit(state, input.value));
  });
  root.querySelector<HTMLSelectElement>('#category')!.addEventListener('change', (e) =>
    update(setCategory(state, (e.target as HTMLSelectElement).value as Category)),
  );
  root.querySelector('#start')!.addEventListener('click', () => timer.start());
  root.querySelector('#pause')!.addEventListener('click', () => timer.pause());
  root.querySelector('#reset')!.addEventListener('click', () => timer.reset());
}

render();
