// // server.ts
// import express, { Request, Response } from "express";
// import path from "path";
// import fs from "fs";
// import { marked } from "marked";
// import hljs from "highlight.js";
// import open from "open";
// import { loadConfig } from "./config";

// const config = loadConfig();

// const renderer = new marked.Renderer();
// marked.setOptions({
//     gfm: true,
//     breaks: true,
//     highlight: (code: string, lang: string) => {
//         const validLang = hljs.getLanguage(lang) ? lang : "plaintext";
//         return hljs.highlight(code, { language: validLang }).value;
//     },
//     langPrefix: 'hljs language-'
// });

// export function startViewMode(port = 3000) {
//     const app = express();

//     app.use("/static", express.static(config.wrkdyPath));

//     app.get("/", (_req: Request, res: Response) => {
//         res.redirect("/pages/index");
//     });

//     app.get("/:type/:name", (req: Request, res: Response) => {
//         const { type, name } = req.params;
//         const filePath = path.join(config.wrkdyPath, type, `${name}.md`);

//         if (!fs.existsSync(filePath)) {
//             return res.status(404).send("Seite nicht gefunden.");
//         }

//         const mdContent = fs.readFileSync(filePath, "utf8");
//         const html = marked.parse(mdContent);

//         res.send(`
//             <html>
//                 <head>
//                     <title>${name}</title>
//                     <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.1.0/github-markdown.min.css" />
//                     <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css" />
//                     <style>
//                         body {
//                             display: flex;
//                             justify-content: center;
//                             padding: 2rem;
//                             background: #f9f9f9;
//                         }
//                         .markdown-body {
//                             max-width: 800px;
//                         }
//                     </style>
//                 </head>
//                 <body>
//                     <article class="markdown-body">${html}</article>
//                 </body>
//             </html>
//         `);
//     });

//     app.listen(port, () => {
//         const url = `http://localhost:${port}`;
//         console.log(`📖 View-Modus gestartet: ${url}`);
//         open(url);
//     });
// }