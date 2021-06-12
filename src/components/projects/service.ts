import { ConflictError, ForbiddenError } from "../../errors";
import { Projects, Project, ProjectJson } from "./model";

const projectCache = new Map<string, Project>();

const projectsService = {
  readAll: async (): Promise<Array<ProjectJson>> => {
    return Projects.all();
  },

  create: async (): Promise<ProjectJson> => {
    const project = new Project();
    projectCache.set(project.id, project);
    return project.toJson();
  },

  read: async (id: string): Promise<ProjectJson> => {
    if (projectCache.has(id)) {
      return projectCache.get(id).toJson();
    }

    const project = new Project(id);
    return project.toJson();
  },

  update: async (
    id: string,
    attributes: Record<string, unknown>
  ): Promise<ProjectJson> => {
    let project: Project = null;
    if (projectCache.has(id)) {
      project = projectCache.get(id);
    } else {
      project = new Project(id);
    }

    const attributeNames = new Set(Object.keys(attributes));
    const restrictedAttributeNames = new Set(["path", "notebooks_dir"]);
    const recognizedAttributeNames = new Set(["canvas", "dag"]);

    const conflicts = new Set(
      [...attributeNames].filter((i) => restrictedAttributeNames.has(i))
    );
    if (conflicts.size > 0) {
      throw new ConflictError(
        `the following attributes cannot be modified: ${[
          ...conflicts.keys(),
        ].join(", ")}`
      );
    }

    const unrecognized = new Set(
      [...attributeNames].filter((i) => !recognizedAttributeNames.has(i))
    );
    if (unrecognized.size > 0) {
      throw new ForbiddenError(
        `the following attributes are not recognized: ${[
          ...unrecognized.keys(),
        ].join(", ")}`
      );
    }

    if (attributeNames.has("canvas")) {
      project.canvas = attributes["canvas"] as Record<string, unknown>;
    }
    if (attributeNames.has("dag")) {
      project.dag = attributes["dag"] as Record<string, unknown>;
    }

    return project.toJson();
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
