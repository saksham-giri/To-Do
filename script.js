const form = document.querySelector("#todo-form");
const input = document.querySelector("#todo-input");
const statusSelect = document.querySelector("#status-select");
const prioritySelect = document.querySelector("#priority-select");
const dueDateInput = document.querySelector("#due-date");
const colorSwatches = document.querySelectorAll(".color-swatch");
const filters = document.querySelectorAll(".filter");
const itemsLeft = document.querySelector("#items-left");
const clearCompleted = document.querySelector("#clear-completed");
const clearAll = document.querySelector("#clear-all");
const toggleAll = document.querySelector("#toggle-all");
const searchInput = document.querySelector("#search-input");
const lanes = document.querySelectorAll(".note-list");
const laneSections = document.querySelectorAll(".lane");
const laneCounts = document.querySelectorAll("[data-count]");

const DEFAULT_COLOR = "#fff6a3";

const state = {
    todos: [],
    filter: "all",
    search: "",
    color: DEFAULT_COLOR,
};

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const saveTodos = () => {
    localStorage.setItem("todos", JSON.stringify(state.todos));
};

const normalizeTodo = (todo, index) => ({
    id: todo.id || createId(),
    title: todo.title || "",
    status: todo.status || (todo.completed ? "done" : "todo"),
    priority: todo.priority || "medium",
    color: todo.color || DEFAULT_COLOR,
    dueDate: todo.dueDate || "",
    pinned: Boolean(todo.pinned),
    position: Number.isFinite(todo.position) ? todo.position : index,
    createdAt: todo.createdAt || Date.now(),
});

const loadTodos = () => {
    const stored = localStorage.getItem("todos");
    if (stored) {
        const parsed = JSON.parse(stored);
        state.todos = parsed.map((todo, index) => normalizeTodo(todo, index));
    }
};

const getFilteredTodos = () => {
    const query = state.search.toLowerCase().trim();
    return state.todos.filter((todo) => {
        const matchesFilter =
            state.filter === "all" ||
            (state.filter === "active" && todo.status !== "done") ||
            (state.filter === "completed" && todo.status === "done");
        const matchesSearch = !query || todo.title.toLowerCase().includes(query);
        return matchesFilter && matchesSearch;
    });
};

const getNextPosition = (status) => {
    const positions = state.todos
        .filter((todo) => todo.status === status)
        .map((todo) => todo.position);
    return positions.length ? Math.max(...positions) + 1 : 0;
};

const updateItemsLeft = () => {
    const count = state.todos.filter((todo) => todo.status !== "done").length;
    itemsLeft.textContent = `${count} item${count === 1 ? "" : "s"} left`;
};

const updateLaneCounts = () => {
    const counts = {
        todo: 0,
        doing: 0,
        done: 0,
    };
    state.todos.forEach((todo) => {
        if (counts[todo.status] !== undefined) counts[todo.status] += 1;
    });
    laneCounts.forEach((countEl) => {
        const status = countEl.dataset.count;
        countEl.textContent = counts[status] ?? 0;
    });
};

const buildNoteElement = (todo) => {
    const note = document.createElement("li");
    note.className = "note";
    note.draggable = true;
    note.dataset.id = todo.id;
    note.style.setProperty("--note-color", todo.color);

    const pin = document.createElement("span");
    pin.className = "note__pin";
    if (todo.pinned) pin.classList.add("is-pinned");
    pin.dataset.action = "pin";
    pin.title = todo.pinned ? "Unpin" : "Pin";

    const header = document.createElement("div");
    header.className = "note__header";

    const priority = document.createElement("span");
    priority.className = `note__priority note__priority--${todo.priority}`;
    priority.textContent = todo.priority;

    const due = document.createElement("span");
    due.textContent = todo.dueDate ? `Due ${todo.dueDate}` : "No due date";

    header.append(priority, due);

    const title = document.createElement("div");
    title.className = "note__title";
    title.textContent = todo.title;
    title.dataset.action = "edit";
    title.setAttribute("role", "textbox");
    title.setAttribute("aria-label", "Todo title");

    const footer = document.createElement("div");
    footer.className = "note__footer";

    const checkWrap = document.createElement("label");
    checkWrap.className = "note__check";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.status === "done";
    checkbox.dataset.action = "toggle";
    const checkText = document.createElement("span");
    checkText.textContent = "Done";
    checkWrap.append(checkbox, checkText);

    const actions = document.createElement("div");
    actions.className = "note__actions";

    const moveBtn = document.createElement("button");
    moveBtn.className = "note__action";
    moveBtn.textContent = "Move";
    moveBtn.dataset.action = "move";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "note__action";
    deleteBtn.textContent = "Delete";
    deleteBtn.dataset.action = "delete";

    actions.append(moveBtn, deleteBtn);
    footer.append(checkWrap, actions);

    note.append(pin, header, title, footer);
    return note;
};

const renderTodos = () => {
    lanes.forEach((lane) => (lane.innerHTML = ""));
    const filtered = getFilteredTodos();

    const grouped = {
        todo: [],
        doing: [],
        done: [],
    };

    filtered.forEach((todo) => {
        grouped[todo.status]?.push(todo);
    });

    Object.keys(grouped).forEach((status) => {
        grouped[status]
            .sort((a, b) => {
                if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
                if (a.position !== b.position) return a.position - b.position;
                return b.createdAt - a.createdAt;
            })
            .forEach((todo) => {
                const lane = document.querySelector(`.note-list[data-status="${status}"]`);
                lane.appendChild(buildNoteElement(todo));
            });
    });

    laneSections.forEach((section) => {
        const status = section.dataset.lane;
        const lane = section.querySelector(".note-list");
        const count = grouped[status]?.length ?? 0;
        section.classList.toggle("is-empty", count === 0);
        if (lane && count === 0 && lane.childElementCount === 0) {
            lane.innerHTML = "";
        }
    });

    updateItemsLeft();
    updateLaneCounts();
};

const addTodo = (title) => {
    const newTodo = normalizeTodo(
        {
            title: title.trim(),
            status: statusSelect.value,
            priority: prioritySelect.value,
            dueDate: dueDateInput.value,
            color: state.color,
            pinned: false,
            position: getNextPosition(statusSelect.value),
            createdAt: Date.now(),
        },
        0
    );
    state.todos.unshift(newTodo);
    saveTodos();
    renderTodos();
};

const updateTodo = (id, updates) => {
    state.todos = state.todos.map((todo) =>
        todo.id === id ? { ...todo, ...updates } : todo
    );
    saveTodos();
    renderTodos();
};

const deleteTodo = (id) => {
    state.todos = state.todos.filter((todo) => todo.id !== id);
    saveTodos();
    renderTodos();
};

const clearCompletedTodos = () => {
    state.todos = state.todos.filter((todo) => todo.status !== "done");
    saveTodos();
    renderTodos();
};

const clearAllTodos = () => {
    state.todos = [];
    saveTodos();
    renderTodos();
};

const toggleAllTodos = () => {
    const allDone = state.todos.length > 0 && state.todos.every((todo) => todo.status === "done");
    state.todos = state.todos.map((todo) => ({
        ...todo,
        status: allDone ? "todo" : "done",
    }));
    saveTodos();
    renderTodos();
};

const setFilter = (filter) => {
    state.filter = filter;
    filters.forEach((btn) => {
        const isActive = btn.dataset.filter === filter;
        btn.classList.toggle("is-active", isActive);
        btn.setAttribute("aria-selected", isActive);
    });
    renderTodos();
};

const setColor = (color, button) => {
    state.color = color;
    colorSwatches.forEach((swatch) => swatch.classList.remove("is-active"));
    button.classList.add("is-active");
};

const persistOrder = () => {
    const updated = [...state.todos];
    lanes.forEach((lane) => {
        const status = lane.dataset.status;
        Array.from(lane.children).forEach((note, index) => {
            const todo = updated.find((item) => item.id === note.dataset.id);
            if (!todo) return;
            todo.status = status;
            todo.position = index;
        });
    });
    state.todos = updated;
    saveTodos();
    renderTodos();
};

const getDragAfterElement = (container, y) => {
    const draggableElements = [...container.querySelectorAll(".note:not(.is-dragging)")];
    return draggableElements.reduce(
        (closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset, element: child };
            }
            return closest;
        },
        { offset: Number.NEGATIVE_INFINITY, element: null }
    ).element;
};

form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!input.value.trim()) return;
    addTodo(input.value);
    input.value = "";
});

clearCompleted.addEventListener("click", clearCompletedTodos);
clearAll.addEventListener("click", clearAllTodos);
toggleAll.addEventListener("click", toggleAllTodos);
filters.forEach((btn) => {
    btn.addEventListener("click", () => setFilter(btn.dataset.filter));
});

searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderTodos();
});

colorSwatches.forEach((swatch) => {
    swatch.addEventListener("click", () => setColor(swatch.dataset.color, swatch));
});

document.addEventListener("click", (event) => {
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) return;

    const note = actionEl.closest(".note");
    const id = note?.dataset.id;
    if (!id) return;

    if (actionEl.dataset.action === "delete") {
        deleteTodo(id);
        return;
    }

    if (actionEl.dataset.action === "pin") {
        const todo = state.todos.find((item) => item.id === id);
        if (!todo) return;
        updateTodo(id, { pinned: !todo.pinned });
        return;
    }

    if (actionEl.dataset.action === "move") {
        const todo = state.todos.find((item) => item.id === id);
        if (!todo) return;
        const nextStatus = todo.status === "todo" ? "doing" : todo.status === "doing" ? "done" : "todo";
        updateTodo(id, { status: nextStatus, position: getNextPosition(nextStatus) });
        return;
    }

    if (actionEl.dataset.action === "edit") {
        const titleEl = actionEl.classList.contains("note__title") ? actionEl : note.querySelector(".note__title");
        if (!titleEl) return;
        titleEl.contentEditable = "true";
        titleEl.classList.add("is-editing");
        titleEl.focus();
        const range = document.createRange();
        range.selectNodeContents(titleEl);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        const finishEdit = () => {
            titleEl.contentEditable = "false";
            titleEl.classList.remove("is-editing");
            const updated = titleEl.textContent.trim();
            if (!updated) {
                deleteTodo(id);
            } else {
                updateTodo(id, { title: updated });
            }
            titleEl.removeEventListener("blur", finishEdit);
            titleEl.removeEventListener("keydown", onKey);
        };

        const onKey = (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                finishEdit();
            }
        };

        titleEl.addEventListener("blur", finishEdit);
        titleEl.addEventListener("keydown", onKey);
    }
});

document.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.dataset.action !== "toggle") return;
    const note = target.closest(".note");
    if (!note) return;
    const id = note.dataset.id;
    updateTodo(id, {
        status: target.checked ? "done" : "todo",
        position: getNextPosition(target.checked ? "done" : "todo"),
    });
});

lanes.forEach((lane) => {
    lane.addEventListener("dragstart", (event) => {
        const note = event.target.closest(".note");
        if (!note) return;
        note.classList.add("is-dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", note.dataset.id);
    });

    lane.addEventListener("dragend", (event) => {
        const note = event.target.closest(".note");
        if (!note) return;
        note.classList.remove("is-dragging");
        persistOrder();
    });

    lane.addEventListener("dragover", (event) => {
        event.preventDefault();
        const dragging = document.querySelector(".note.is-dragging");
        if (!dragging) return;
        const afterElement = getDragAfterElement(lane, event.clientY);
        if (afterElement == null) {
            lane.appendChild(dragging);
        } else {
            lane.insertBefore(dragging, afterElement);
        }
    });

    lane.addEventListener("drop", (event) => {
        event.preventDefault();
    });
});

laneSections.forEach((section) => {
    section.addEventListener("dragenter", () => section.classList.add("is-over"));
    section.addEventListener("dragleave", () => section.classList.remove("is-over"));
    section.addEventListener("drop", () => section.classList.remove("is-over"));
});

loadTodos();
renderTodos();
