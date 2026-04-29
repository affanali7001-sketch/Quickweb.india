const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
const navItems = document.querySelectorAll(".nav-links a");
const year = document.getElementById("year");
const contactForm = document.getElementById("contactForm");
const portfolioGrid = document.getElementById("portfolioGrid");
const pricingGrid = document.getElementById("pricingGrid");

year.textContent = new Date().getFullYear();

menuToggle.addEventListener("click", () => {
    navLinks.classList.toggle("open");
});

navItems.forEach((item) => {
    item.addEventListener("click", () => {
        navLinks.classList.remove("open");
    });
});

function renderPortfolio(projects) {
    portfolioGrid.innerHTML = projects.map((project) => `
        <article class="portfolio-card reveal visible">
            <div class="portfolio-image" style="background-image: url('${project.image || "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80"}');"></div>
            <div class="portfolio-content">
                <span class="portfolio-tag">${project.tag}</span>
                <h3>${project.title}</h3>
                <p>${project.description}</p>
                <div class="portfolio-points">
                    <span>Website</span>
                    <span>Responsive</span>
                    <span>Business Ready</span>
                </div>
                ${project.link ? `<a class="project-link" href="${project.link}" target="_blank">View Project</a>` : ""}
            </div>
        </article>
    `).join("");
}

function renderPricing(plans) {
    pricingGrid.innerHTML = plans.map((plan) => `
        <article class="pricing-card ${plan.featured ? "featured" : ""} reveal visible">
            ${plan.featured ? `<span class="popular-badge">Most Popular</span>` : ""}
            <h3>${plan.name}</h3>
            <p>${plan.description}</p>

            <div class="price">
                ${plan.oldPrice ? `<span class="old-price">${plan.oldPrice}</span>` : ""}
                ${plan.price}
                <span>/ starting</span>
            </div>

            <ul class="feature-list">
                ${plan.features.map((feature) => `<li>${feature}</li>`).join("")}
            </ul>

            <a class="btn ${plan.featured ? "btn-primary" : "btn-secondary"}" href="#contact">
                Choose ${plan.name}
            </a>
        </article>
    `).join("");
}

async function loadContent() {
    const response = await fetch("/api/content");
    const data = await response.json();

    document.getElementById("heroBadge").textContent = data.hero.badge;
    document.getElementById("heroTitle").innerHTML = data.hero.title;
    document.getElementById("heroText").textContent = data.hero.text;
    document.getElementById("aboutTitle").textContent = data.about.title;
    document.getElementById("aboutText").textContent = data.about.text;

    renderPortfolio(data.projects);
    renderPricing(data.pricing);

    document.querySelectorAll(".reveal").forEach((item) => revealObserver.observe(item));
}

const revealObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
            }
        });
    },
    { threshold: 0.14 }
);

document.querySelectorAll(".reveal").forEach((item) => revealObserver.observe(item));

const activeObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                navItems.forEach((link) => {
                    link.classList.toggle("active", link.getAttribute("href") === "#" + entry.target.id);
                });
            }
        });
    },
    { rootMargin: "-40% 0px -55% 0px" }
);

document.querySelectorAll("main section[id]").forEach((section) => activeObserver.observe(section));

contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const name = formData.get("name");
    const phone = formData.get("phone");
    const business = formData.get("business");
    const service = formData.get("service");
    const message = formData.get("message") || "I want to know more about QuickWeb.india700 services.";
    const whatsappNumber = "918808610713";

    const text = `Hello QuickWeb.india700,%0A%0AName: ${encodeURIComponent(name)}%0APhone: ${encodeURIComponent(phone)}%0ABusiness Type: ${encodeURIComponent(business)}%0AService Needed: ${encodeURIComponent(service)}%0AMessage: ${encodeURIComponent(message)}`;

    window.open(`https://wa.me/${whatsappNumber}?text=${text}`, "_blank");
});

loadContent();