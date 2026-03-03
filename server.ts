import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("people.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS people (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    approved INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/people", (req, res) => {
    try {
      const people = db.prepare("SELECT * FROM people ORDER BY created_at DESC").all();
      res.json(people);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch people" });
    }
  });

  app.post("/api/people", (req, res) => {
    const { id, name, approved } = req.body;
    if (!id || !name) {
      return res.status(400).json({ error: "ID and Name are required" });
    }
    try {
      const stmt = db.prepare("INSERT INTO people (id, name, approved) VALUES (?, ?, ?)");
      stmt.run(id, name, approved ? 1 : 0);
      res.status(201).json({ id, name, approved });
    } catch (error) {
      res.status(400).json({ error: "ID already exists or invalid data" });
    }
  });

  app.put("/api/people/:id", (req, res) => {
    const { id } = req.params;
    const { approved } = req.body;
    try {
      const stmt = db.prepare("UPDATE people SET approved = ? WHERE id = ?");
      const result = stmt.run(approved ? 1 : 0, id);
      if (result.changes === 0) {
        return res.status(404).json({ error: "Person not found" });
      }
      res.json({ id, approved });
    } catch (error) {
      res.status(500).json({ error: "Failed to update person" });
    }
  });

  app.delete("/api/people/:id", (req, res) => {
    const { id } = req.params;
    try {
      const stmt = db.prepare("DELETE FROM people WHERE id = ?");
      stmt.run(id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete person" });
    }
  });

  app.post("/api/people/bulk", (req, res) => {
    const { people } = req.body;
    if (!Array.isArray(people)) {
      return res.status(400).json({ error: "Invalid data format" });
    }

    const insert = db.prepare("INSERT OR REPLACE INTO people (id, name, approved) VALUES (?, ?, ?)");
    const insertMany = db.transaction((data) => {
      for (const p of data) {
        insert.run(p.id.toString(), p.name, p.approved ? 1 : 0);
      }
    });

    try {
      insertMany(people);
      res.json({ message: `Successfully imported ${people.length} people` });
    } catch (error) {
      res.status(500).json({ error: "Failed to bulk import" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
