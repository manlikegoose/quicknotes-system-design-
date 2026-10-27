const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadButton = document.getElementById("load-btn");
const noteForm = document.getElementById("note-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");
const submitButton = document.getElementById("submit-btn");
const statusElement = document.getElementById("status");
const notesList = document.getElementById("notes-list");

let notes = [];
let notesLoaded = false;

function showStatus(message, type = "") {
    statusElement.textContent = message;
    statusElement.className = type ? `status ${type}` : "status";
}

// Reusable request helper: all HTTP calls check response.ok and report status codes.
async function request(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        const error = new Error(`Request failed with status ${response.status}.`);
        error.status = response.status;
        throw error;
    }

    // DELETE may return 200 or 204 with no JSON body.
    if (response.status === 204) {
        return { data: null, status: response.status };
    }

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
        ? await response.json()
        : null;

    return { data, status: response.status };
}

function renderNotes(list) {
    notesList.replaceChildren();

    if (list.length === 0) {
        const emptyItem = document.createElement("li");
        emptyItem.className = "empty-state";
        emptyItem.textContent = notesLoaded
            ? "No notes to show. Create a note or load notes again."
            : "No notes yet. Select “Load notes” to fetch sample notes.";
        notesList.appendChild(emptyItem);
        return;
    }

    list.forEach((note) => {
        const item = document.createElement("li");
        item.className = "note-card";

        const title = document.createElement("h3");
        title.textContent = note.title || "(Untitled note)";

        const body = document.createElement("p");
        body.textContent = note.body || "No body provided.";

        const meta = document.createElement("div");
        meta.className = "note-meta";
        meta.textContent = `Note ID: ${note.id}`;

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-btn";
        deleteButton.textContent = "Delete";
        deleteButton.setAttribute("aria-label", `Delete note ${note.id}`);
        deleteButton.addEventListener("click", () => deleteNote(note.id, deleteButton));

        item.append(title, body, meta, deleteButton);
        notesList.appendChild(item);
    });
}

async function loadNotes() {
    loadButton.disabled = true;
    showStatus("Loading notes...", "loading");

    try {
        const result = await request(`${API_URL}?_limit=10`);
        notes = Array.isArray(result.data) ? result.data : [];
        notesLoaded = true;
        renderNotes(notes);

        if (notes.length === 0) {
            showStatus("The server returned no notes.", "success");
        } else {
            showStatus(`Loaded ${notes.length} notes from the server.`, "success");
        }
    } catch (error) {
        showStatus(
            error.status
                ? `We couldn't load notes (HTTP ${error.status}). Please try again.`
                : "We couldn't connect to the server. Check your connection and try again.",
            "error"
        );
    } finally {
        loadButton.disabled = false;
    }
}

async function createNote(event) {
    event.preventDefault();

    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();

    if (!title) {
        showStatus("Please enter a title before creating a note.", "error");
        titleInput.focus();
        return;
    }

    if (title.length > 100) {
        showStatus("The title must be 100 characters or fewer.", "error");
        titleInput.focus();
        return;
    }

    submitButton.disabled = true;
    showStatus("Creating note...", "loading");

    try {
        const result = await request(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=UTF-8" },
            body: JSON.stringify({ title, body, userId: 1 })
        });

        const createdNote = result.data;
        if (!createdNote || typeof createdNote.id === "undefined") {
            throw new Error("The server returned an unexpected response.");
        }

        // JSONPlaceholder simulates POST and does not persist the new record.
        // Keep the returned note in this page's local array for this demo session.
        notes = [createdNote, ...notes];
        notesLoaded = true;
        renderNotes(notes);
        noteForm.reset();
        showStatus(
            `Note created (status ${result.status}, id ${createdNote.id}).`,
            "success"
        );
    } catch (error) {
        showStatus(
            error.status
                ? `We couldn't create the note (HTTP ${error.status}). Please try again.`
                : "We couldn't create the note. Please try again.",
            "error"
        );
    } finally {
        submitButton.disabled = false;
    }
}

async function deleteNote(id, button) {
    button.disabled = true;
    showStatus("Deleting note...", "loading");

    try {
        const result = await request(`${API_URL}/${encodeURIComponent(id)}`, {
            method: "DELETE"
        });

        // JSONPlaceholder confirms the DELETE request but does not persist changes.
        // Remove the note from local state so the current demo view reflects the action.
        notes = notes.filter((note) => String(note.id) !== String(id));
        notesLoaded = true;
        renderNotes(notes);
        showStatus(`Note deleted (status ${result.status}, id ${id}).`, "success");
    } catch (error) {
        button.disabled = false;
        showStatus(
            error.status
                ? `We couldn't delete the note (HTTP ${error.status}). Please try again.`
                : "We couldn't delete the note. Please try again.",
            "error"
        );
    } finally {
        // The button may have been removed by renderNotes after a successful deletion.
        button.disabled = false;
    }
}

loadButton.addEventListener("click", loadNotes);
noteForm.addEventListener("submit", createNote);
