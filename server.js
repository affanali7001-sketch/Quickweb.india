const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = "Affan@123#4$5^6"; // Change this to a secure password in production

const dataPath = path.join(__dirname, "content.json");
const uploadsDir = path.join(__dirname, "public", "uploads");

const activeTokens = new Set();

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

const storage = multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const safeName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
        cb(null, safeName);
    }
});

const upload = multer({ storage });

function readData() {
    return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

function writeData(data) {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

function requireAuth(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.replace("Bearer ", "");

    if (!activeTokens.has(token)) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    next();
}

app.post("/api/login", (req, res) => {
    const { password } = req.body;

    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ message: "Wrong password" });
    }

    const token = crypto.randomBytes(24).toString("hex");
    activeTokens.add(token);

    res.json({ token });
});

app.get("/api/content", (req, res) => {
    res.json(readData());
});

app.put("/api/content", requireAuth, (req, res) => {
    writeData(req.body);
    res.json({ success: true });
});

app.post("/api/projects", requireAuth, upload.single("image"), (req, res) => {
    const data = readData();

    const project = {
        id: crypto.randomUUID(),
        title: req.body.title,
        tag: req.body.tag,
        description: req.body.description,
        link: req.body.link || "",
        image: req.file ? `/uploads/${req.file.filename}` : ""
    };

    data.projects.unshift(project);
    writeData(data);

    res.json(project);
});

app.delete("/api/projects/:id", requireAuth, (req, res) => {
    const data = readData();
    data.projects = data.projects.filter((project) => project.id !== req.params.id);
    writeData(data);

    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`QuickWeb.india700 running at http://localhost:${PORT}`);
    console.log(`Admin panel running at http://localhost:${PORT}/admin.html`);
});