import {
  ConflictError,
  ForbiddenError,
  UnprocessableEntityError,
} from "../../errors";
import { Projects, Project, ProjectJson } from "./model";

const projectCache = new Map<string, Project>();

const _validateProjectAttributes = (
  attributes: Record<string, unknown>
): void => {
  if (!attributes) {
    throw new UnprocessableEntityError("project attributes are missing");
  }

  const attributeNames = new Set(Object.keys(attributes));
  const restrictedAttributeNames = new Set(["path", "notebooks_dir"]);
  const recognizedAttributeNames = new Set(["name", "canvas", "dag"]);

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
};

const projectsService = {
  readAll: async (): Promise<Array<ProjectJson>> => {
    const projects = await Projects.get();
    return projects.map((project) => project.toJson());
  },

  exists: async (id: string): Promise<boolean> => {
    return Project.exists(id);
  },

  create: async (attributes: Record<string, unknown>): Promise<ProjectJson> => {
    _validateProjectAttributes(attributes);

    const projectName = attributes["name"] as string;
    if (!projectName) {
      throw new UnprocessableEntityError("project name is missing");
    }

    const project = await Project.make(projectName);
    projectCache.set(project.id, project);
    return project.toJson();
  },

  read: async (id: string): Promise<ProjectJson> => {
    if (projectCache.has(id)) {
      return projectCache.get(id).toJson();
    }

    const project = await Project.get(id);
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
      project = await Project.get(id);
    }

    _validateProjectAttributes(attributes);

    const attributeNames = new Set(Object.keys(attributes));
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

    const project = await Project.get(id);
    project.delete();
  },
};

export default projectsService;
