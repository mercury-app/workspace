import { Project, ProjectJson } from "./model";

const projectsService = {
  readAll: async (): Promise<Array<ProjectJson>> => {
    const projects = [];
    return projects.map((project) => project.asJson());
  },

  create: async (): Promise<ProjectJson> => {
    const project = new Project();
    return project.asJson();
  },

  read: async (id: string): Promise<ProjectJson> => {
    const project = new Project(id);
    return project.asJson();
  },

  update: async (id: string): Promise<ProjectJson> => {
    const project = new Project(id);
    return project.asJson();
  },

  delete: async (id: string): Promise<void> => {
    const project = new Project(id);
    project.delete();
  },
};

export default projectsService;
