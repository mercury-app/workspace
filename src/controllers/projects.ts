import Project from "../models/projects";

export const readProjects = async (): Promise<Array<Project>> => {
  return [];
};

export const createProject = async (): Promise<Project> => {
  return new Project();
};

export const readProject = async (id: string): Promise<Project> => {
  return new Project(id);
};

export const updateProject = async (id: string): Promise<Project> => {
  return new Project(id);
};

export const deleteProject = async (id: string): Promise<void> => {
  const project = new Project(id);
  project.delete();
};
