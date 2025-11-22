# 🧭 Mimirlink: Architektur- und Implementierungsplan

Dieses Dokument beschreibt die geplante Architektur und die Implementierungsschritte für Mimirlink, eine offline-fähige, geräteübergreifende Markdown-Notiz-App.

## 🏛️ Kernarchitektur: Hybrides Modell

Wir verfolgen einen hybriden Ansatz, der die Vorteile einer robusten Server-Architektur mit der Flexibilität einer modernen Offline-Frontend-Anwendung kombiniert.

### 1. Backend: Self-Hosted Node.js Sync-Server
- **Zweck:** Dient als zentraler **Synchronisierungs-Hub** und die einzige "Source of Truth" für alle Notizen.
- **Hosting:** Läuft auf einem vom Benutzer kontrollierten Homeserver.
- **Aufgaben:**
    - **API bereitstellen:** Eine JSON-basierte API zum Abrufen und Einreichen von Änderungen an Notizen. Die API muss Versionierung oder Zeitstempel unterstützen, um Synchronisationskonflikte zu erkennen.
    - **Dateiverwaltung:** Das Backend ist direkt für das Lesen und Schreiben der Markdown-Dateien auf dem Dateisystem des Servers verantwortlich.
    - **Frontend ausliefern:** Dient als Webserver für die Frontend-Anwendung.

### 2. Frontend: SolidJS Progressive Web App (PWA)
- **Zweck:** Eine hochgradig responsive und offline-fähige Benutzeroberfläche.
- **Plattform:** Läuft in jedem modernen Browser (Desktop, iPhone, iPad).
- **Kerntechnologien:**
    - **Service Worker:** Sorgt dafür, dass die App-Hülle sofort geladen wird, auch ohne Netzwerkverbindung.
    - **IndexedDB:** Dient als vollständige lokale Datenbank auf dem Client-Gerät. Jede Notiz, die vom Server geladen wird, wird hier zwischengespeichert.
- **Funktionsweise:**
    - **Offline First:** Alle Lese- und Schreibvorgänge (Anzeigen, Bearbeiten von Notizen) werden **immer** zuerst gegen die lokale IndexedDB ausgeführt. Das sorgt für eine sofortige Reaktion der Benutzeroberfläche, unabhängig vom Netzwerkstatus.
    - **Hintergrund-Synchronisation:** Die App versucht im Hintergrund, eine Verbindung zum Homeserver herzustellen. Wenn sie erfolgreich ist, führt sie eine Zwei-Wege-Synchronisation durch:
        1.  **Push:** Lokale, offline getätigte Änderungen werden an den Server gesendet.
        2.  **Pull:** Änderungen von anderen Geräten (die bereits auf dem Server sind) werden heruntergeladen und in die lokale IndexedDB integriert.

---

## 🧩 Implementierungsschritte

### **Phase 1: Grundgerüst & Editor**
- **Status:** Weitgehend abgeschlossen.
- **Aufgaben:** Setup mit SolidJS, Vite und CodeMirror 6. Implementierung des Hybrid-Vorschau-Editors mit Unterstützung für die wichtigsten Markdown-Elemente.

### **Phase 2: Übergang zur Offline-Architektur (Frontend)**
1.  **Client-Side-Store implementieren:**
    - Erstellen einer Abstraktionsschicht (z.B. `store.ts`) für alle Datenoperationen.
    - Diese Schicht wird zunächst eine einfache In-Memory-Datenbank verwenden, um die Logik zu entwickeln.
2.  **Auf IndexedDB umstellen:**
    - Die `store.ts`-Implementierung wird durch eine auf IndexedDB basierende Implementierung ersetzt. Bibliotheken wie `idb` können hier helfen.
3.  **UI an den Store anbinden:**
    - Alle UI-Komponenten (`FileList.tsx`, `HybridEditor.tsx`) werden so umgebaut, dass sie ihre Daten ausschliesslich vom lokalen Store lesen und Änderungen dorthin schreiben.
    - Der direkte Aufruf von `fetch` in den Komponenten entfällt.

### **Phase 3: Synchronisierungs-Logik**
1.  **Backend-API erweitern:**
    - Die bestehende API (`/api/files`) muss erweitert werden, um Metadaten wie Zeitstempel oder Versionen für jede Datei zu liefern.
    - Neue Endpunkte werden benötigt, um Änderungen stapelweise zu empfangen (z.B. `POST /api/sync`).
2.  **Sync-Service im Frontend:**
    - Ein neuer Service (`sync.ts`) wird im Frontend erstellt.
    - Dieser Service ist dafür verantwortlich, den lokalen Store mit dem Backend abzugleichen.
    - Er implementiert die Logik für den Zwei-Wege-Abgleich und eine einfache Strategie zur Konfliktlösung (z.B. "letzter Schreibvorgang gewinnt").
3.  **PWA-Fähigkeit herstellen:**
    - Ein Service Worker wird konfiguriert, um die App-Hülle offline verfügbar zu machen.

### **Phase 4: Features & Polish**
- **Kalender-Interaktion:** Klicks auf den Kalender filtern die Notizen im lokalen Store.
- **Wiki-Links & Tags:** Parsing und Navigation für `[[Links]]` und `#tags` implementieren.
- **Command Palette:** Eine `Ctrl+P`-Palette für schnellen Zugriff auf Befehle und Notizen.
- **UI/UX-Verbesserungen:** Dark/Light-Theme, responsives Layout für Mobilgeräte.

---

## 🔭 Zukünftige Richtungen

### Git-basiertes Versioning (Backend)
- **Idee:** Das Backend könnte die Markdown-Dateien zusätzlich in einem Git-Repository versionieren. Jede Änderung, die über die API hereinkommt, führt zu einem automatischen Commit.
- **Vorteile:** Bietet eine vollständige Änderungshistorie, ermöglicht Backups und Wiederherstellungen.
- **Erweiterung:** Das Frontend könnte eine UI erhalten, um die Commit-Historie einer Notiz anzuzeigen oder sogar Git-Remotes für die Synchronisation mit Diensten wie GitHub zu verwalten. Dies würde die Notwendigkeit eines eigenen Cloud-Dienstes potenziell überflüssig machen und stattdessen auf Git als Sync-Mechanismus setzen.

### Query-Sprache
- Implementierung einer eingebetteten Abfragesprache, um dynamische Listen von Notizen basierend auf Tags, Datum oder anderen Metadaten zu erstellen, ähnlich wie bei SilverBullet oder Obsidian.