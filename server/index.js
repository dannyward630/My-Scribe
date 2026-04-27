import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const uploadsDir = path.join(root, "uploads");
const outputsDir = path.join(root, "outputs");
const transcriberPath = path.join(root, "transcriber", "transcribe.py");

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(outputsDir, { recursive: true });

const app = express();
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_request, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${crypto.randomUUID()}${extension}`);
    }
  }),
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024
  }
});

app.use(cors());
app.use(express.json());

function pythonCommand() {
  if (process.env.VIDSCRIBE_PYTHON) {
    return process.env.VIDSCRIBE_PYTHON;
  }

  return process.platform === "win32" ? "py" : "python3";
}

function pythonArgs(args) {
  if (process.env.VIDSCRIBE_PYTHON) {
    return [transcriberPath, ...args];
  }

  return process.platform === "win32" ? ["-3", transcriberPath, ...args] : [transcriberPath, ...args];
}

function runTranscriber(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonCommand(), pythonArgs(args), {
      cwd: root,
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8"
      },
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Transcriber exited with code ${code}.`));
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(new Error(`Transcriber returned invalid JSON. ${error instanceof Error ? error.message : ""}`));
      }
    });
  });
}

function requestOptions(body) {
  const options = [
    "--quality",
    String(body.quality || "balanced"),
    "--language",
    String(body.language || "auto"),
    "--out",
    outputsDir
  ];

  if (body.stem) {
    options.push("--stem", String(body.stem));
  }

  return options;
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.post("/api/transcribe/file", upload.single("media"), async (request, response) => {
  if (!request.file) {
    response.status(400).json({ error: "Upload a media file first." });
    return;
  }

  try {
    const result = await runTranscriber([
      "file",
      request.file.path,
      ...requestOptions({ ...request.body, stem: path.parse(request.file.originalname).name })
    ]);
    response.json(result);
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "Transcription failed." });
  } finally {
    fs.rm(request.file.path, { force: true }, () => {});
  }
});

app.post("/api/transcribe/url", upload.none(), async (request, response) => {
  const url = String(request.body.url || "").trim();
  if (!url) {
    response.status(400).json({ error: "Paste a public video or audio URL first." });
    return;
  }

  try {
    const result = await runTranscriber(["url", url, ...requestOptions(request.body)]);
    response.json(result);
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "Transcription failed." });
  }
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`VidScribe API listening on http://localhost:${port}`);
});
