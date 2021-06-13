import { UnprocessableEntityError } from "../../errors";
import { Commits, Commit, CommitJson } from "./model";
import { Project, ProjectJson } from "../projects/model";
import config from "../../config";

const commitsService = {
  readAll: async (project: ProjectJson): Promise<Array<CommitJson>> => {
    const commits = await Commits.all(project);
    return commits.map((commit) => commit.toJson());
  },

  exists: async (project: ProjectJson, sha: string): Promise<boolean> => {
    return Commit.exists(project, sha);
  },

  create: async (
    projectJson: ProjectJson,
    attributes: Record<string, unknown>
  ): Promise<CommitJson> => {
    if (!attributes) {
      throw new UnprocessableEntityError("commit attributes are missing");
    }

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
    const project = new Project(projectJson.id);
    const commitSha = await project.commit(
      authorName,
      authorEmail,
      commitMessage
    );

    const commit = await Commit.exact(projectJson, commitSha);
    return commit.toJson();
  },

  read: async (projectJson: ProjectJson, id: string): Promise<CommitJson> => {
    const commit = await Commit.exact(projectJson, id);
    return commit.toJson();
  },
};

export default commitsService;
