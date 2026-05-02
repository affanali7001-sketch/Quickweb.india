let token = localStorage.getItem("quickweb_admin_token") || "";
let siteData = null;

const loginCard = document.getElementById("loginCard");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const logoutBtn = document.getElementById("logoutBtn");
const contentForm = document.getElementById("contentForm");
const pricingEditor = document.getElementById("pricingEditor");
const savePricingBtn = document.getElementById("savePricingBtn");
const projectForm = document.getElementById("projectForm");
const projectList = document.getElementById("projectList");

function showDashboard() {
    loginCard.classList.add("hidden");
    dashboard.classList.remove("hidden");
}

function showLogin() {
    dashboard.classList.add("hidden");
    loginCard.classList.remove("hidden");
}

// ✅ FIX: Token expire hone pe auto logout aur login page pe bhejo
function handleAuthError() {
    token = "";
    localStorage.removeItem("quickweb_admin_token");
    showLogin();
    loginMessage.textContent = "Session expired. Please login again.";
    loginMessage.style.color = "#f87171";
}

async function api(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`
        }
    });

    // ✅ FIX: 401 aane pe auto logout
    if (response.status === 401) {
        handleAuthError();
        throw new Error("Unauthorized - please login again");
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed: ${response.status}`);
    }

    return response.json();
}

async function loadAdminData() {
    try {
        siteData = await api("/api/content");

        // ✅ FIX: Safely load fields — agar koi field missing ho to crash na ho
        document.getElementById("heroBadgeInput").value = siteData.hero?.badge || "";
        document.getElementById("heroTitleInput").value = siteData.hero?.title || "";
        document.getElementById("heroTextInput").value = siteData.hero?.text || "";
        document.getElementById("aboutTitleInput").value = siteData.about?.title || "";
        document.getElementById("aboutTextInput").value = siteData.about?.text || "";

        renderPricingEditor();
        renderProjectList();
    } catch (err) {
        if (!err.message.includes("Unauthorized")) {
            alert("Error loading data: " + err.message);
        }
    }
}

function renderPricingEditor() {
    if (!siteData.pricing || !siteData.pricing.length) {
        pricingEditor.innerHTML = "<p>No pricing plans found.</p>";
        return;
    }

    pricingEditor.innerHTML = `<div class="pricing-edit-grid">
        ${siteData.pricing.map((plan, index) => `
            <div class="pricing-box">
                <label>Plan Name</label>
                <input value="${plan.name || ""}" data-price-field="name" data-index="${index}" />

                <label>Old Price (strikethrough)</label>
                <input value="${plan.oldPrice || ""}" data-price-field="oldPrice" data-index="${index}" />

                <label>Current Price</label>
                <input value="${plan.price || ""}" data-price-field="price" data-index="${index}" />

                <label>Description</label>
                <textarea data-price-field="description" data-index="${index}">${plan.description || ""}</textarea>

                <label>Features (ek line = ek feature)</label>
                <textarea data-price-field="features" data-index="${index}">${(plan.features || []).join("\n")}</textarea>
            </div>
        `).join("")}
    </div>`;
}

function renderProjectList() {
    if (!siteData.projects || !siteData.projects.length) {
        projectList.innerHTML = "<p>No projects yet.</p>";
        return;
    }

    projectList.innerHTML = siteData.projects.map((project) => `
        <div class="project-item">
            <img 
                src="${project.image || "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80"}" 
                alt="${project.title}"
                onerror="this.src='https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80'"
            />
            <div>
                <h3>${project.title}</h3>
                <p><strong>${project.tag}</strong></p>
                <p>${project.description}</p>
                ${project.link ? `<a href="${project.link}" target="_blank">🔗 Open Project</a>` : ""}
            </div>
            <div class="project-actions">
                <button class="danger" onclick="deleteProject('${project.id}')">Delete</button>
            </div>
        </div>
    `).join("");
}

// ========================
// LOGIN
// ========================

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const password = document.getElementById("password").value;
    loginMessage.textContent = "Logging in...";
    loginMessage.style.color = "#94a3b8";

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (!response.ok) {
            loginMessage.textContent = data.message || "Login failed";
            loginMessage.style.color = "#f87171";
            return;
        }

        token = data.token;
        localStorage.setItem("quickweb_admin_token", token);
        loginMessage.textContent = "";
        showDashboard();
        await loadAdminData();

    } catch (err) {
        loginMessage.textContent = "Server error. Try again.";
        loginMessage.style.color = "#f87171";
    }
});

// ========================
// LOGOUT
// ========================

logoutBtn.addEventListener("click", () => {
    token = "";
    localStorage.removeItem("quickweb_admin_token");
    showLogin();
    loginMessage.textContent = "";
});

// ========================
// SAVE CONTENT
// ========================

contentForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const saveBtn = contentForm.querySelector("button[type='submit']");
    saveBtn.textContent = "Saving...";
    saveBtn.disabled = true;

    try {
        // ✅ FIX: siteData null ho to bhi crash na ho
        if (!siteData) siteData = {};
        if (!siteData.hero) siteData.hero = {};
        if (!siteData.about) siteData.about = {};

        siteData.hero.badge = document.getElementById("heroBadgeInput").value;
        siteData.hero.title = document.getElementById("heroTitleInput").value;
        siteData.hero.text = document.getElementById("heroTextInput").value;
        siteData.about.title = document.getElementById("aboutTitleInput").value;
        siteData.about.text = document.getElementById("aboutTextInput").value;

        await api("/api/content", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(siteData)
        });

        saveBtn.textContent = "✅ Saved!";
        setTimeout(() => {
            saveBtn.textContent = "Save Content";
            saveBtn.disabled = false;
        }, 2000);

    } catch (err) {
        saveBtn.textContent = "❌ Failed!";
        saveBtn.disabled = false;
        if (!err.message.includes("Unauthorized")) {
            alert("Save failed: " + err.message);
        }
    }
});

// ========================
// SAVE PRICING
// ========================

savePricingBtn.addEventListener("click", async () => {
    savePricingBtn.textContent = "Saving...";
    savePricingBtn.disabled = true;

    try {
        if (!siteData) siteData = {};
        if (!siteData.pricing) siteData.pricing = [];

        document.querySelectorAll("[data-price-field]").forEach((field) => {
            const index = Number(field.dataset.index);
            const key = field.dataset.priceField;

            if (!siteData.pricing[index]) siteData.pricing[index] = {};

            if (key === "features") {
                siteData.pricing[index][key] = field.value.split("\n").map(f => f.trim()).filter(Boolean);
            } else {
                siteData.pricing[index][key] = field.value;
            }
        });

        await api("/api/content", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(siteData)
        });

        savePricingBtn.textContent = "✅ Pricing Saved!";
        setTimeout(() => {
            savePricingBtn.textContent = "Save Pricing";
            savePricingBtn.disabled = false;
        }, 2000);

    } catch (err) {
        savePricingBtn.textContent = "❌ Failed!";
        savePricingBtn.disabled = false;
        if (!err.message.includes("Unauthorized")) {
            alert("Save failed: " + err.message);
        }
    }
});

// ========================
// ADD PROJECT
// ========================

projectForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const addBtn = projectForm.querySelector("button[type='submit']");
    addBtn.textContent = "Adding...";
    addBtn.disabled = true;

    try {
        const formData = new FormData();
        formData.append("title", document.getElementById("projectTitle").value);
        formData.append("tag", document.getElementById("projectTag").value);
        formData.append("description", document.getElementById("projectDescription").value);
        formData.append("link", document.getElementById("projectLink").value || "");

        const imageFile = document.getElementById("projectImage").files[0];
        if (imageFile) {
            formData.append("image", imageFile);
        }

        const response = await fetch("/api/projects", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData
        });

        if (response.status === 401) {
            handleAuthError();
            return;
        }

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || "Add project failed");
        }

        projectForm.reset();
        await loadAdminData();

        addBtn.textContent = "✅ Project Added!";
        setTimeout(() => {
            addBtn.textContent = "Add Project";
            addBtn.disabled = false;
        }, 2000);

    } catch (err) {
        addBtn.textContent = "❌ Failed!";
        addBtn.disabled = false;
        if (!err.message.includes("Unauthorized")) {
            alert("Error: " + err.message);
        }
    }
});

// ========================
// DELETE PROJECT
// ========================

async function deleteProject(id) {
    if (!confirm("Is project ko delete karna chahte ho?")) return;

    try {
        await api(`/api/projects/${id}`, { method: "DELETE" });
        await loadAdminData();
    } catch (err) {
        if (!err.message.includes("Unauthorized")) {
            alert("Delete failed: " + err.message);
        }
    }
}

// ========================
// AUTO LOGIN CHECK
// ========================

if (token) {
    showDashboard();
    loadAdminData().catch(() => {
        // Token invalid hai — logout karo
        handleAuthError();
    });
}
