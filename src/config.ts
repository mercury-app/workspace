import * as fs from "fs";

const mercuryDirPath = `${process.env.HOME}/.mercury`;
if (!fs.existsSync(mercuryDirPath)) {
  fs.mkdirSync(mercuryDirPath);
}

const projectsDirPath = `${mercuryDirPath}/projects`;
if (!fs.existsSync(projectsDirPath)) {
  fs.mkdirSync(projectsDirPath);
}

const projectsDbPath = `${projectsDirPath}/project_db.json`;
if (!fs.existsSync(projectsDbPath)) {
  const data = JSON.stringify([]);
  fs.writeFileSync(projectsDbPath, data, { encoding: "utf-8" });
}

const config = {
  projectsDirPath: projectsDirPath,
  projectDbPath: projectsDbPath,
  defaultCommitAuthorName: "Mercury",
  defaultCommitAuthorEmail: "auto.commit@mercury",
  defaultCommitMessage: "Auto-committed changes to files",
  defaultPortRange: [50000, 50099] as [number, number],
};

export default config;
