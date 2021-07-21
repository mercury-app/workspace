import {
  ConflictError,
  ForbiddenError,
  UnprocessableEntityError,
} from "../../errors";
import { Projects, Project, ProjectJson } from "./model";

const _validateProjectAttributes = (
  attributes: Record<string, unknown>
): void => {
  if (!attributes) {
    throw new UnprocessableEntityError("project attributes are missing");
  }

  const attributeNames = new Set(Object.keys(attributes));
  const restrictedAttributeNames = new Set([
    "path",
    "notebooks_dir",
    "latest_commit",
    "has_uncommitted_changes",
  ]);
  const recognizedAttributeNames = new Set([
    "name",
    "canvas",
    "workflow",
    "current_commit",
  ]);

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
    return Promise.all(projects.map(async (project) => await project.toJson()));
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
    return project.toJson();
  },

  read: async (id: string): Promise<ProjectJson> => {
    const project = await Project.get(id);
    return project.toJson();
  },

  update: async (
    id: string,
    attributes: Record<string, unknown>
  ): Promise<ProjectJson> => {
    _validateProjectAttributes(attributes);

    const project = await Project.get(id);
    const attributeNames = new Set(Object.keys(attributes));
    if (attributeNames.has("name")) {
      project.rename(attributes["name"] as string);
    }
    if (attributeNames.has("canvas")) {
      project.canvas = attributes["canvas"] as Record<string, unknown>;
    }
    if (attributeNames.has("workflow")) {
      project.workflow = attributes["workflow"] as Record<string, unknown>;
    }
    if (attributeNames.has("current_commit")) {
      project.currentCommit = attributes["current_commit"] as string;
    }

    return project.toJson();
  },

  delete: async (id: string): Promise<void> => {
    const project = await Project.get(id);
    project.delete();
  },
};

export default projectsService;
