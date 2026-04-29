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

async function api(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error("Request failed");
    }

    return response.json();
}

async function loadAdminData() {
    siteData = await api("/api/content");

    document.getElementById("heroBadgeInput").value = siteData.hero.badge;
    document.getElementById("heroTitleInput").value = siteData.hero.title;
    document.getElementById("heroTextInput").value = siteData.hero.text;
    document.getElementById("aboutTitleInput").value = siteData.about.title;
    document.getElementById("aboutTextInput").value = siteData.about.text;

    renderPricingEditor();
    renderProjectList();
}

function renderPricingEditor() {
    pricingEditor.innerHTML = `<div class="pricing-edit-grid">
        ${siteData.pricing.map((plan, index) => `
            <div class="pricing-box">
                <label>Plan Name</label>
                <input value="${plan.name}" data-price-field="name" data-index="${index}" />

                <label>Price</label>
                <input value="${plan.price}" data-price-field="price" data-index="${index}" />

                <label>Description</label>
                <textarea data-price-field="description" data-index="${index}">${plan.description}</textarea>

                <label>Features, one per line</label>
                <textarea data-price-field="features" data-index="${index}">${plan.features.join("\n")}</textarea>
            </div>
        `).join("")}
    </div>`;
}

function renderProjectList() {
    projectList.innerHTML = siteData.projects.map((project) => `
        <div class="project-item">
            <img src="${project.image || "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80"}" alt="${project.title}" />
            <div>
                <h3>${project.title}</h3>
                <p>${project.tag}</p>
                <p>${project.description}</p>
                ${project.link ? `<a href="${project.link}" target="_blank">Open Project</a>` : ""}
            </div>
            <div class="project-actions">
                <button class="danger" onclick="deleteProject('${project.id}')">Delete</button>
            </div>
        </div>
    `).join("");
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const password = document.getElementById("password").value;

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (!response.ok) {
            loginMessage.textContent = data.message || "Login failed";
            return;
        }

        token = data.token;
        localStorage.setItem("quickweb_admin_token", token);
        showDashboard();
        await loadAdminData();
    } catch (error) {
        loginMessage.textContent = "Server error";
    }
});

logoutBtn.addEventListener("click", () => {
    token = "";
    localStorage.removeItem("quickweb_admin_token");
    showLogin();
});

contentForm.addEventListener("submit", async (event) => {
    event.preventDefault();

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

    alert("Content saved");
});

savePricingBtn.addEventListener("click", async () => {
    document.querySelectorAll("[data-price-field]").forEach((field) => {
        const index = Number(field.dataset.index);
        const key = field.dataset.priceField;

        if (key === "features") {
            siteData.pricing[index][key] = field.value.split("\n").filter(Boolean);
        } else {
            siteData.pricing[index][key] = field.value;
        }
    });

    await api("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(siteData)
    });

    alert("Pricing saved");
});

projectForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData();
    formData.append("title", document.getElementById("projectTitle").value);
    formData.append("tag", document.getElementById("projectTag").value);
    formData.append("description", document.getElementById("projectDescription").value);
    formData.append("link", document.getElementById("projectLink").value);

    const image = document.getElementById("projectImage").files[0];
    if (image) {
        formData.append("image", image);
    }

    await fetch("/api/projects", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
    });

    projectForm.reset();
    await loadAdminData();
    alert("Project added");
});

async function deleteProject(id) {
    if (!confirm("Delete this project?")) return;

    await api(`/api/projects/${id}`, {
        method: "DELETE"
    });

    await loadAdminData();
}

if (token) {
    showDashboard();
    loadAdminData().catch(() => showLogin());
}