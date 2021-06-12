import { UnprocessableEntityError } from "../../errors";
import { Commits, Commit, CommitJson } from "./model";
import { Project } from "../projects/model";
import config from "../../config";

const commitsService = {
  readAll: async (project: Project): Promise<Array<CommitJson>> => {
    return Commits.all(project);
  },

  create: async (
    project: Project,
    attributes: Record<string, unknown>
  ): Promise<CommitJson> => {
    const commitMessage = attributes["message"] as string;
    if (commitMessage) {
      throw new UnprocessableEntityError("commit message is missing");
    }

    const authorName = attributes["author_name"]
      ? (attributes["author_name"] as string)
      : config.defaultCommitAuthorName;
    const authorEmail = attributes["author_email"]
      ? (attributes["author_email"] as string)
      : config.defaultCommitAuthorEmail;
    const commitSha = await project.commit(
      authorName,
      authorEmail,
      commitMessage
    );
    const commit = new Commit(project, commitSha);
    return commit.toJson();
  },

  read: async (project: Project, id: string): Promise<CommitJson> => {
    const commit = new Commit(project, id);
    return commit.toJson();
  },
};

export default commitsService;
