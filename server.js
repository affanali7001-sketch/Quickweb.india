const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");

const app = express();
const PORT = process.env.PORT || 3000;

/* ===============================
   SECURITY CONFIG
================================*/

app.use(helmet());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10
});

/* ===============================
   PASSWORD HASH
================================*/

const ADMIN_HASH =
  "$2b$10$7n3x7yCqkV7m7P5q2LQv7eC6pQ0Y0T6uKc0S7qf2Y6uT0FqHk3aW2"; 
// password = Affan@123#4$5^6

/* ===============================
   PATHS
================================*/

const dataPath = path.join(__dirname, "content.json");
const uploadsDir = path.join(__dirname, "public", "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

/* ===============================
   FILE UPLOAD SECURITY
================================*/

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName =
      Date.now() + "-" + crypto.randomBytes(6).toString("hex") + ext;

    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/webp"];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only images allowed"));
    }

    cb(null, true);
  }
});

/* ===============================
   TOKEN STORAGE
================================*/

const activeTokens = new Set();

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.replace("Bearer ", "");

  if (!activeTokens.has(token)) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  next();
}

/* ===============================
   DATA FUNCTIONS
================================*/

function readData() {
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

function writeData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

/* ===============================
   LOGIN
================================*/

app.post("/api/login", loginLimiter, async (req, res) => {
  const { password } = req.body;

  const valid = await bcrypt.compare(password, ADMIN_HASH);

  if (!valid) {
    return res.status(401).json({ message: "Wrong password" });
  }

  const token = crypto.randomBytes(24).toString("hex");
  activeTokens.add(token);

  res.json({ token });
});

/* ===============================
   CONTENT
================================*/

app.get("/api/content", (req, res) => {
  res.json(readData());
});

app.put("/api/content", requireAuth, (req, res) => {
  writeData(req.body);
  res.json({ success: true });
});

/* ===============================
   PROJECTS
================================*/

app.post(
  "/api/projects",
  requireAuth,
  upload.single("image"),
  (req, res) => {
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
  }
);

app.delete("/api/projects/:id", requireAuth, (req, res) => {
  const data = readData();

  data.projects = data.projects.filter(
    (project) => project.id !== req.params.id
  );

  writeData(data);

  res.json({ success: true });
});

/* ===============================
   SERVER
================================*/

app.listen(PORT, () => {
  console.log(`QuickWeb running on port ${PORT}`);
});
