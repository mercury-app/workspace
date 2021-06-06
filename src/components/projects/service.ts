import * as fs from "fs";

import config from "../../config";
import { Project, ProjectJson } from "./model";

const projectCache = new Map<string, Project>();

const projectsService = {
  readAll: async (): Promise<Array<ProjectJson>> => {
    const projectsDbPath = config.projectsDbPath;
    const projectsData = fs.readFileSync(projectsDbPath, {
      encoding: "utf-8",
      flag: "r",
    });
    return JSON.parse(projectsData);
  },

  create: async (): Promise<ProjectJson> => {
    const project = new Project();
    projectCache.set(project.id, project);
    return project.asJson();
  },

  read: async (id: string): Promise<ProjectJson> => {
    if (projectCache.has(id)) {
      return projectCache.get(id).asJson();
    }

    const project = new Project(id);
    return project.asJson();
  },

  update: async (id: string): Promise<ProjectJson> => {
    if (projectCache.has(id)) {
      return projectCache.get(id).asJson();
    }

    const project = new Project(id);
    return project.asJson();
  },

  delete: async (id: string): Promise<void> => {
    if (projectCache.has(id)) {
      projectCache.get(id).delete();
      return;
    }

    const project = new Project(id);
    project.delete();
  },
};

export default projectsService;
