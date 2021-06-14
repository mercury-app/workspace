import { ForbiddenError, UnprocessableEntityError } from "../../errors";
import { Commits, Commit, CommitJson } from "./model";
import { Project, ProjectJson } from "../projects/model";
import config from "../../config";

const _validateCommitAttributes = (
  attributes: Record<string, unknown>
): void => {
  if (!attributes) {
    throw new UnprocessableEntityError("commit attributes are missing");
  }

  const attributeNames = new Set(Object.keys(attributes));
  const recognizedAttributeNames = new Set([
    "message",
    "author_name",
    "author_email",
  ]);

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

const commitsService = {
  readAll: async (projectJson: ProjectJson): Promise<Array<CommitJson>> => {
    const project = await Project.get(projectJson.id);
    const commits = await Commits.get(project);
    return commits.map((commit) => commit.toJson());
  },

  exists: async (projectJson: ProjectJson, sha: string): Promise<boolean> => {
    const project = await Project.get(projectJson.id);
    return await Commit.exists(project, sha);
  },

  create: async (
    projectJson: ProjectJson,
    attributes: Record<string, unknown>
  ): Promise<CommitJson> => {
    _validateCommitAttributes(attributes);

    const commitMessage = attributes["message"] as string;
    if (!commitMessage) {
      throw new UnprocessableEntityError("commit message is missing");
    }

    const authorName = attributes["author_name"]
      ? (attributes["author_name"] as string)
      : config.defaultCommitAuthorName;
    const authorEmail = attributes["author_email"]
      ? (attributes["author_email"] as string)
      : config.defaultCommitAuthorEmail;
    const project = await Project.get(projectJson.id);

    const commit = await Commit.make(
      project,
      commitMessage,
      authorName,
      authorEmail
    );
    return commit.toJson();
  },

  read: async (projectJson: ProjectJson, id: string): Promise<CommitJson> => {
    const project = await Project.get(projectJson.id);
    const commit = await Commit.get(project, id);
    return commit.toJson();
  },
};

export default commitsService;
