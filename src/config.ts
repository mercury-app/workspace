import * as fs from "fs";

const mercuryDirPath = `${process.env.HOME}/.mercury`;
if (!fs.existsSync(mercuryDirPath)) {
  fs.mkdirSync(mercuryDirPath);
}

const projectsDirPath = `${mercuryDirPath}/projects`;
if (!fs.existsSync(projectsDirPath)) {
  fs.mkdirSync(projectsDirPath);
}

const projectsDbPath = `${projectsDirPath}/projects_db.json`;
if (!fs.existsSync(projectsDbPath)) {
  const data = JSON.stringify([]);
  fs.writeFileSync(projectsDbPath, data, { encoding: "utf-8" });
}

const config = {
  projectsDirPath: projectsDirPath,
  projectsDbPath: projectsDbPath,
};

export default config;
