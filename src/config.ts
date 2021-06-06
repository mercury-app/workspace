import * as fs from "fs";

const projectsDirPath = () => {
  const mercuryDirPath = `${process.env.HOME}/.mercury`;
  if (!fs.existsSync(mercuryDirPath)) {
    fs.mkdirSync(mercuryDirPath);
  }
  const projectsDirPath = `${mercuryDirPath}/projects`;
  if (!fs.existsSync(projectsDirPath)) {
    fs.mkdirSync(projectsDirPath);
  }
  return projectsDirPath;
};

const config = {
  projectsDirPath: projectsDirPath(),
};

export default config;
