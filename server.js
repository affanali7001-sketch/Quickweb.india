const { createClient } = require("@supabase/supabase-js")

const supabase = createClient(
  "https://ctjwjqpbzhtomgllwhdo.supabase.co",
  "sb_publishable_dEfra4mKpdaoFXsdKsjKzg_3540-8cP"
)

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
   BASIC SECURITY
=========================*/

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "https:", "data:"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"]
      }
    }
  })
);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts. Try later." }
});

/* =========================
   ADMIN PASSWORD
=========================*/

// password = Affan@123#4$5^6
const ADMIN_HASH =
  "$2b$10$1fW3M7FqK9MZ5Rz0hXk0u.eP1sO4y0d0E5mVdXxQ9wLqk8YfQp1G2";

/* =========================
   PATHS
=========================*/

const dataPath = path.join(__dirname, "content.json");
const uploadsDir = path.join(__dirname, "public", "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/* =========================
   MIDDLEWARE
=========================*/

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

/* =========================
   FILE UPLOAD SECURITY
=========================*/

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name =
      Date.now() + "-" + crypto.randomBytes(6).toString("hex") + ext;

    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/webp"];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only image files allowed"));
    }

    cb(null, true);
  }
});

/* =========================
   TOKEN AUTH
=========================*/

const activeTokens = new Set();

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.replace("Bearer ", "");

  if (!activeTokens.has(token)) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  next();
}

/* =========================
   DATA FUNCTIONS
=========================*/
async function readData() {
  const { data, error } = await supabase
    .from("site_content")
    .select("data")
    .eq("id", 1)
    .single()

  if (error) throw error

  return data.data
}

catch {
    return { projects: [] };
  }
}

async function writeData(content) {
  const { error } = await supabase
    .from("site_content")
    .update({ data: content })
    .eq("id", 1)

  if (error) throw error
}

/* =========================
   LOGIN
=========================*/

app.post("/api/login", loginLimiter, async (req, res) => {

  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: "Password required" });
  }

  if (password !== "Affan@123#4$5^6") {
    return res.status(401).json({ message: "Wrong password" });
  }

  const token = crypto.randomBytes(24).toString("hex");

  activeTokens.add(token);

  res.json({ token });

});

/* =========================
   CONTENT API
=========================*/

app.get("/api/content", (req, res) => {
  res.json(await readData())
});

app.put("/api/content", requireAuth, (req, res) => {
  await writeData(req.body)
  res.json({ success: true });
});

/* =========================
   PROJECTS API
=========================*/

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

  data.projects = data.projects.filter(
    p => p.id !== req.params.id
  );

  writeData(data);

  res.json({ success: true });
});

/* =========================
   SERVER START
=========================*/

app.listen(PORT, () => {
  console.log(`QuickWeb running on port ${PORT}`);
});
