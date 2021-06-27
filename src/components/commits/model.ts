import * as fs from "fs";
import git, { CommitObject } from "isomorphic-git";

import { Project } from "../projects/model";

export interface CommitJson extends Object {
  id: string;
  type: string;
  attributes?: {
    project_id: string;
    parent_commit_refs: Array<string>;
    message: string;
    author_name: string;
    author_email: string;
    timestamp: number;
    timezone_offset: number;
  };
}

export class Commits {
  static readonly type = "commits";

  static async get(project: Project): Promise<Array<Commit>> {
    const commitResults = await git.log({
      fs,
      dir: project.path,
      ref: Project.mainBranch,
    });
    const commits = Promise.all(
      commitResults.map((result) => Commit.get(project, result.oid))
    );
    return commits;
  }
}

export class Commit {
  private readonly _sha: string;
  private readonly _projectId: string;
  private readonly _parentCommitRefs: Array<string>;
  private readonly _message: string;
  private readonly _authorName: string;
  private readonly _authorEmail: string;
  private readonly _timestamp: number;
  private readonly _timezoneOffset: number;

  static async make(
    project: Project,
    commitMessage: string,
    authorName: string,
    authorEmail: string
  ): Promise<Commit> {
    const commitSha = await project.commit(
      authorName,
      authorEmail,
      commitMessage
    );
    return Commit.get(project, commitSha);
  }

  static async get(project: Project, sha: string): Promise<Commit> {
    const commit = await git
      .readCommit({
        fs,
        dir: project.path,
        oid: sha,
      })
      .then((commitResult) => {
        return new Commit(project.id, commitResult.oid, commitResult.commit);
      })
      .catch(() => {
        return null;
      });

    return commit;
  }

  static async exists(project: Project, sha: string): Promise<boolean> {
    return (await Commit.get(project, sha)) !== null;
  }

  private constructor(
    projectId: string,
    sha: string,
    commitObject: CommitObject
  ) {
    this._sha = sha;
    this._projectId = projectId;
    this._parentCommitRefs = commitObject.parent;
    this._message = commitObject.message;
    this._authorName = commitObject.author.name;
    this._authorEmail = commitObject.author.email;
    this._timestamp = commitObject.author.timestamp;
    this._timezoneOffset = commitObject.author.timezoneOffset;
  }

  public toJson(): CommitJson {
    return {
      id: this._sha,
      type: Commits.type,
      attributes: {
        project_id: this._projectId,
        parent_commit_refs: this._parentCommitRefs,
        message: this._message,
        author_name: this._authorName,
        author_email: this._authorEmail,
        timestamp: this._timestamp,
        timezone_offset: this._timezoneOffset,
      },
    };
  }
}
