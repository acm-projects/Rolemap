"use client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AddedSkill = {
  category: "Languages" | "Frameworks" | "Developer Tools" | "Libraries";
  name: string;
};

export type AddedProject = {
  id: string;
  name: string;
  tech: string;
  period: string;
  bullets: string[];
};

export type ResumeDocumentProps = {
  addedSkills: AddedSkill[];
  addedProjects: AddedProject[];
};

// ─── Static resume data ───────────────────────────────────────────────────────

const EXPERIENCE = [
  {
    role: "Undergraduate Research Assistant",
    company: "Texas A&M University",
    location: "College Station, TX",
    period: "June 2020 – Present",
    bullets: [
      "Developed a REST API using FastAPI and PostgreSQL to store data from learning management systems",
      "Developed a full-stack web application using Flask, React, PostgreSQL and Docker to analyze GitHub data",
      "Explored ways to visualize GitHub collaboration in a classroom setting",
    ],
  },
  {
    role: "Information Technology Support Specialist",
    company: "Southwestern University",
    location: "Georgetown, TX",
    period: "Sep. 2018 – Present",
    bullets: [
      "Communicate with managers to set up campus computers used on campus",
      "Assess and troubleshoot computer problems brought by students, faculty and staff",
      "Maintain upkeep of computers, classroom equipment, and 200 printers across campus",
    ],
  },
];

const BASE_PROJECTS = [
  {
    name: "Gitlytics",
    tech: "Python, Flask, React, PostgreSQL, Docker",
    period: "June 2020 – Present",
    bullets: [
      "Developed a full-stack web application using Flask serving a REST API with React as the frontend",
      "Implemented GitHub OAuth to get data from user's repositories",
      "Visualized GitHub data to show collaboration",
      "Used Celery and Redis for asynchronous tasks",
    ],
  },
  {
    name: "Simple Paintball",
    tech: "Spigot API, Java, Maven, TravisCI, Git",
    period: "May 2018 – May 2020",
    bullets: [
      "Developed a Minecraft server plugin to entertain kids during free time for a previous job",
      "Published plugin to websites gaining 2K+ downloads and an average 4.5/5-star review",
      "Implemented continuous delivery using TravisCI to build the plugin upon a new release",
      "Collaborated with Minecraft server administrators to suggest features and get feedback about the plugin",
    ],
  },
];

const BASE_SKILLS = {
  Languages: "Java, Python, C/C++, SQL (Postgres), JavaScript, HTML/CSS, R",
  Frameworks: "React, Node.js, Flask, JUnit, WordPress, Material-UI, FastAPI",
  "Developer Tools":
    "Git, Docker, TravisCI, Google Cloud Platform, VS Code, Visual Studio, PyCharm, IntelliJ, Eclipse",
  Libraries: "pandas, NumPy, Matplotlib",
};

// ─── Shared section heading style ─────────────────────────────────────────────

const sectionHeading: React.CSSProperties = {
  fontSize: "11pt",
  fontWeight: "bold",
  borderBottom: "1.5px solid #000",
  marginBottom: "3px",
  paddingBottom: "1px",
  marginTop: "8px",
};

const row: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ResumeDocument({
  addedSkills,
  addedProjects,
}: ResumeDocumentProps) {
  // Merge added skills into the base skill categories
  const skillCategories = Object.keys(
    BASE_SKILLS,
  ) as (keyof typeof BASE_SKILLS)[];

  const mergedSkills = skillCategories.reduce(
    (acc, cat) => {
      const extras = addedSkills
        .filter((s) => s.category === cat)
        .map((s) => s.name);
      acc[cat] =
        extras.length > 0
          ? `${BASE_SKILLS[cat]}, ${extras.join(", ")}`
          : BASE_SKILLS[cat];
      return acc;
    },
    {} as Record<string, string>,
  );

  const allProjects = [...BASE_PROJECTS, ...addedProjects];

  return (
    <div
      id="resume-document"
      style={{
        fontFamily: "Calibri, 'Calibri', sans-serif",
        fontSize: "13pt",
        lineHeight: "1.35",
        color: "#000",
        background: "#fff",
        width: "100%",
        padding: "0.45in 0.5in",
        boxSizing: "border-box",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        textRendering: "geometricPrecision",
      }}
    >
      {/* ── Header ── */}
      <header style={{ textAlign: "center", marginBottom: "4px" }}>
        <div
          style={{ fontSize: "16pt", fontWeight: "bold", marginBottom: "2px" }}
        >
          Jake Ryan
        </div>
        <div style={{ fontSize: "9.5pt", color: "#000" }}>
          123-456-7890 | jake@su.edu | linkedin.com/in/jake | github.com/jake
        </div>
      </header>

      {/* ── Education ── */}
      <section>
        <div style={sectionHeading}>Education</div>

        <div style={{ marginBottom: "3px" }}>
          <div style={row}>
            <span style={{ fontWeight: "bold" }}>Southwestern University</span>
            <span>Georgetown, TX</span>
          </div>
          <div style={row}>
            <span style={{ fontStyle: "italic" }}>
              Bachelor of Arts in Computer Science, Minor in Business
            </span>
            <span style={{ fontStyle: "italic" }}>Aug. 2018 – May 2021</span>
          </div>
        </div>

        <div>
          <div style={row}>
            <span style={{ fontWeight: "bold" }}>Blinn College</span>
            <span>Bryan, TX</span>
          </div>
          <div style={row}>
            <span style={{ fontStyle: "italic" }}>
              Associate's in Liberal Arts
            </span>
            <span style={{ fontStyle: "italic" }}>Aug. 2014 – May 2018</span>
          </div>
        </div>
      </section>

      {/* ── Experience ── */}
      <section>
        <div style={sectionHeading}>Experience</div>

        {EXPERIENCE.map((exp, i) => (
          <div
            key={i}
            style={{ marginBottom: i < EXPERIENCE.length - 1 ? "5px" : 0 }}
          >
            <div style={row}>
              <span style={{ fontWeight: "bold" }}>{exp.role}</span>
              <span style={{ fontStyle: "italic" }}>{exp.period}</span>
            </div>
            <div style={row}>
              <span style={{ fontStyle: "italic" }}>{exp.company}</span>
              <span>{exp.location}</span>
            </div>
            <ul style={{ margin: "1px 0 0 18px", padding: 0 }}>
              {exp.bullets.map((b, j) => (
                <li key={j} style={{ marginBottom: "1px" }}>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* ── Projects ── */}
      <section>
        <div style={sectionHeading}>Projects</div>

        {allProjects.map((proj, i) => (
          <div
            key={i}
            style={{ marginBottom: i < allProjects.length - 1 ? "5px" : 0 }}
          >
            <div style={row}>
              <span>
                <span style={{ fontWeight: "bold" }}>{proj.name}</span>
                <span style={{ fontStyle: "italic" }}> | {proj.tech}</span>
              </span>
              <span style={{ fontStyle: "italic" }}>{proj.period}</span>
            </div>
            <ul style={{ margin: "1px 0 0 18px", padding: 0 }}>
              {proj.bullets.map((b, j) => (
                <li key={j} style={{ marginBottom: "1px" }}>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* ── Technical Skills ── */}
      <section>
        <div style={sectionHeading}>Technical Skills</div>
        <div style={{ lineHeight: "1.55" }}>
          {Object.entries(mergedSkills).map(([cat, val]) => (
            <div key={cat}>
              <span style={{ fontWeight: "bold" }}>{cat}: </span>
              <span>{val}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
