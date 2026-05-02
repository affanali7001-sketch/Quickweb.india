const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
   SUPABASE
=========================*/

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ctjwjqpbzhtomgllwhdo.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "sb_publishable_dEfra4mKpdaoFXsdKsjKzg_3540-8cP";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* =========================
   BASIC SECURITY
=========================*/

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "https:", "data:", "http:"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
        connectSrc: ["'self'", "https:"]
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

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Affan@123#4$5^6";

/* =========================
   PATHS & UPLOADS
=========================*/

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
   FILE UPLOAD
=========================*/

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + "-" + crypto.randomBytes(6).toString("hex") + ext;
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
  const token = header.replace("Bearer ", "").trim();

  if (!token || !activeTokens.has(token)) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  next();
}

/* =========================
   DEFAULT DATA
=========================*/

const DEFAULT_DATA = {
  hero: {
    badge: "Websites + AI Automation for Local Businesses",
    title: "Professional Websites and <span>AI Assistants</span> for Local Businesses",
    text: "QuickWeb.india700 helps schools, restaurants, coaching institutes, stores, and local businesses get a modern online presence and automate customer communication with smart AI systems."
  },
  about: {
    title: "Helping small businesses grow with modern websites and AI technology.",
    text: "Our mission is to make digital growth simple for local businesses that want more customers, better communication, and a professional online identity."
  },
  pricing: [
    {
      name: "Starter",
      oldPrice: "₹10,000",
      price: "₹1,999",
      description: "Best for small businesses that need a clean online presence.",
      featured: false,
      features: [
        "One-page business website",
        "Mobile responsive design",
        "Contact form",
        "Basic SEO setup",
        "WhatsApp button",
        "Google Maps section"
      ]
    },
    {
      name: "Business",
      oldPrice: "₹30,000",
      price: "₹4,999",
      description: "Best for businesses that want a stronger website and lead system.",
      featured: true,
      features: [
        "Multi-section professional website",
        "Service pages or product sections",
        "Image gallery",
        "Lead enquiry form",
        "Google Maps integration",
        "SEO friendly structure",
        "Basic AI enquiry flow setup"
      ]
    },
    {
      name: "Premium",
      oldPrice: "₹70,000",
      price: "₹9,999",
      description: "Best for businesses that want website plus AI communication automation.",
      featured: false,
      features: [
        "Complete business website",
        "Advanced contact and enquiry system",
        "AI assistant automation setup",
        "Payment reminder call flow",
        "Event invitation automation",
        "Business notification automation",
        "Launch support and improvements"
      ]
    }
  ],
  projects: [
    {
      id: "school-demo",
      title: "Bright Future School",
      tag: "School Demo",
      description: "Admissions, notices, gallery, events, contact form, and parent communication support.",
      link: "",
      image: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=900&q=80"
    },
    {
      id: "restaurant-demo",
      title: "Urban Taste Restaurant",
      tag: "Restaurant Demo",
      description: "Menu showcase, opening hours, table enquiry, location map, and customer update automation.",
      link: "",
      image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80"
    },
    {
      id: "coaching-demo",
      title: "Success Point Coaching",
      tag: "Coaching Demo",
      description: "Course details, batch timings, enquiry form, result highlights, and fee reminder automation.",
      link: "",
      image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80"
    }
  ]
};

/* =========================
   DATA FUNCTIONS
=========================*/

async function readData() {
  try {
    const { data, error } = await supabase
      .from("site_content")
      .select("data")
      .eq("id", 1)
      .single();

    if (error) {
      console.error("Supabase read error:", error.message);
      // Agar Supabase me row nahi hai to default data return karo
      return DEFAULT_DATA;
    }

    if (!data || !data.data) {
      console.log("No data found in Supabase, using default");
      return DEFAULT_DATA;
    }

    // Ensure sabhi required fields exist hain
    const result = data.data;
    if (!result.hero) result.hero = DEFAULT_DATA.hero;
    if (!result.about) result.about = DEFAULT_DATA.about;
    if (!result.pricing) result.pricing = DEFAULT_DATA.pricing;
    if (!result.projects) result.projects = DEFAULT_DATA.projects;

    console.log("Data loaded from Supabase successfully");
    return result;

  } catch (err) {
    console.error("readData exception:", err.message);
    return DEFAULT_DATA;
  }
}

async function writeData(content) {
  try {
    // Pehle check karo row exist karti hai ya nahi
    const { data: existing } = await supabase
      .from("site_content")
      .select("id")
      .eq("id", 1)
      .single();

    let error;

    if (existing) {
      // Row hai to update karo
      const result = await supabase
        .from("site_content")
        .update({ data: content })
        .eq("id", 1);
      error = result.error;
    } else {
      // Row nahi hai to insert karo
      const result = await supabase
        .from("site_content")
        .insert({ id: 1, data: content });
      error = result.error;
    }

    if (error) {
      console.error("Supabase write error:", error.message);
      throw error;
    }

    console.log("Data saved to Supabase successfully");
  } catch (err) {
    console.error("writeData exception:", err.message);
    throw err;
  }
}

/* =========================
   LOGIN
=========================*/

app.post("/api/login", loginLimiter, async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: "Password required" });
  }

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: "Wrong password" });
  }

  const token = crypto.randomBytes(24).toString("hex");
  activeTokens.add(token);

  console.log("Admin logged in successfully");
  res.json({ token });
});

/* =========================
   CONTENT API
=========================*/

app.get("/api/content", async (req, res) => {
  try {
    const data = await readData();
    res.json(data);
  } catch (err) {
    console.error("/api/content error:", err.message);
    res.json(DEFAULT_DATA);
  }
});

app.put("/api/content", requireAuth, async (req, res) => {
  try {
    await writeData(req.body);
    res.json({ success: true });
  } catch (err) {
    console.error("/api/content PUT error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* =========================
   PROJECTS API
=========================*/

app.post("/api/projects", requireAuth, upload.single("image"), async (req, res) => {
  try {
    const data = await readData();

    const project = {
      id: crypto.randomUUID(),
      title: req.body.title || "Untitled",
      tag: req.body.tag || "Project",
      description: req.body.description || "",
      link: req.body.link || "",
      image: req.file
        ? `/uploads/${req.file.filename}`
        : (req.body.imageUrl || "")
    };

    if (!Array.isArray(data.projects)) {
      data.projects = [];
    }

    data.projects.unshift(project);
    await writeData(data);

    console.log("Project added:", project.title);
    res.json(project);
  } catch (err) {
    console.error("/api/projects POST error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/projects/:id", requireAuth, async (req, res) => {
  try {
    const data = await readData();

    data.projects = data.projects.filter(p => p.id !== req.params.id);
    await writeData(data);

    console.log("Project deleted:", req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("/api/projects DELETE error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   DEBUG ROUTE (sirf development me)
   /api/debug - Supabase connection test
=========================*/

app.get("/api/debug", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("site_content")
      .select("id")
      .eq("id", 1)
      .single();

    if (error) {
      return res.json({ status: "error", message: error.message });
    }

    res.json({ status: "ok", rowFound: !!data });
  } catch (err) {
    res.json({ status: "exception", message: err.message });
  }
});

/* =========================
   SERVER START
=========================*/

app.listen(PORT, () => {
  console.log(`QuickWeb running on port ${PORT}`);
  console.log(`Supabase URL: ${SUPABASE_URL}`);
});
