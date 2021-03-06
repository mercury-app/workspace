import * as fs from "fs";
import * as fsp from "fs/promises";
import * as uuid from "uuid";
import git from "isomorphic-git";

import config from "../../config";

interface ProjectDbEntry extends Object {
  id: string;
  name: string;
  port_range: [number, number];
}

export interface ProjectJson extends Object {
  id: string;
  type: string;
  attributes?: {
    name: string;
    path: string;
    canvas: Record<string, unknown>;
    workflow: Record<string, unknown>;
    notebooks_dir: string;
    current_commit: string;
    latest_commit: string;
    has_uncommitted_changes: boolean;
    port_range: [number, number];
  };
}

export class Projects {
  static readonly type = "projects";

  static async db(): Promise<Array<ProjectDbEntry>> {
    const projectDbPath = config.projectDbPath;
    const projectDbData = await fsp.readFile(projectDbPath, {
      encoding: "utf-8",
      flag: "r",
    });
    return JSON.parse(projectDbData) as Array<ProjectDbEntry>;
  }

  static async get(): Promise<Array<Project>> {
    const projectDb = await Projects.db();
    return Promise.all(
      projectDb.map((projectEntry) => Project.get(projectEntry.id))
    );
  }
}

export class Project {
  private static readonly _canvasJsonFilename = "canvas.json";
  private static readonly _workflowJsonFilename = "workflow.json";
  static readonly mainBranch = "master";

  private readonly _id: string;
  private readonly _path: string;
  private readonly _stateFilesDir: string;
  private readonly _notebooksDir: string;
  private readonly _canvasJsonPath: string;
  private readonly _workflowJsonPath: string;
  private _name: string;
  private _canvas: Record<string, unknown>;
  private _workflow: Record<string, unknown>;
  private _repo: { fs: typeof fs; dir: string };
  private _latestCommit: string;
  private _currentCommit: string;
  private _portRange: [number, number];

  static async make(name: string): Promise<Project> {
    const id = uuid.v4().replace(/-/g, "");
    const project = new Project(id, name);
    await project._createProjectDir();
    await project._addProjectEntryToDb();
    await project._writeProjectFiles();
    await project._initRepo();
    await project._readProjectFiles();
    return project;
  }

  static async get(id: string): Promise<Project> {
    const projectDb = await Projects.db();
    const projectEntry = projectDb.find(
      (projectEntry) => projectEntry.id === id
    );
    if (!projectEntry) {
      return null;
    }

    const project = new Project(projectEntry.id, projectEntry.name);
    project._portRange = projectEntry.port_range;

    await project._readProjectFiles();
    project._currentCommit = await project._resolveHead();
    project._latestCommit = await project._resolveMain();

    return project;
  }

  static async exists(id: string): Promise<boolean> {
    const projectDb = await Projects.db();
    return projectDb.some((projectEntry) => projectEntry.id === id);
  }

  private constructor(id: string, name: string) {
    this._id = id;
    this._name = name;
    const projectParentDirPath = config.projectsDirPath;
    this._path = `${projectParentDirPath}/${this._id}`;
    this._stateFilesDir = `${this._path}/.mercury`;
    this._notebooksDir = `${this._path}/notebooks`;

    this._canvasJsonPath = `${this._stateFilesDir}/${Project._canvasJsonFilename}`;
    this._workflowJsonPath = `${this._stateFilesDir}/${Project._workflowJsonFilename}`;
    this._canvas = {};
    this._workflow = {};

    // A convenience structure that is passed in calls to isomorphic git APIs
    this._repo = { fs: fs, dir: this._path };
    this._currentCommit = "";
    this._latestCommit = "";
  }

  private async _createProjectDir(): Promise<boolean> {
    try {
      await fsp.mkdir(this._path, { recursive: true });
      await fsp.mkdir(this._stateFilesDir, { recursive: true });
      await fsp.mkdir(this._notebooksDir, { recursive: true });
    } catch (exception) {
      return false;
    }
    return true;
  }

  private async _removeProjectDir(): Promise<void> {
    await fsp.rm(this._path, { recursive: true, force: true });
  }

  private async _addProjectEntryToDb(): Promise<void> {
    const projectDbPath = config.projectDbPath;
    let projectDbData = await fsp.readFile(projectDbPath, {
      encoding: "utf-8",
      flag: "r",
    });
    const projectDb = JSON.parse(projectDbData) as Array<ProjectDbEntry>;

    // Find out which shortest port range is available
    const occupiedPortRanges = projectDb.map(
      (projectEntry) => projectEntry.port_range
    );
    const adjustPortRange = (portRange: [number, number]): [number, number] => {
      if (
        occupiedPortRanges.find(
          (existingPortRange) =>
            existingPortRange[0] === portRange[0] &&
            existingPortRange[1] === portRange[1]
        )
      ) {
        return adjustPortRange([portRange[0] + 100, portRange[1] + 100]);
      }
      return portRange;
    };
    this._portRange = adjustPortRange(config.defaultPortRange);

    const projectEntry: ProjectDbEntry = {
      id: this._id,
      name: this._name,
      port_range: this._portRange,
    };
    projectDb.push(projectEntry);
    projectDbData = JSON.stringify(projectDb);
    await fsp.writeFile(projectDbPath, projectDbData, { encoding: "utf-8" });
  }

  private async _removeProjectEntryFromDb(): Promise<void> {
    const projectDbPath = config.projectDbPath;
    let projectDbData = await fsp.readFile(projectDbPath, {
      encoding: "utf-8",
      flag: "r",
    });
    let projectDb = JSON.parse(projectDbData);
    projectDb = projectDb.filter(
      (projectEntry: ProjectDbEntry) => projectEntry.id !== this._id
    );
    projectDbData = JSON.stringify(projectDb);
    await fsp.writeFile(projectDbPath, projectDbData, { encoding: "utf-8" });
  }

  private async _readProjectFiles(): Promise<void> {
    this._canvas = await this._readJsonFileAsObject(this._canvasJsonPath);
    this._workflow = await this._readJsonFileAsObject(this._workflowJsonPath);
  }

  private async _readJsonFileAsObject(
    path: string
  ): Promise<Record<string, unknown>> {
    const data = await fsp.readFile(path, { encoding: "utf-8", flag: "r" });
    return JSON.parse(data);
  }

  private async _writeProjectFiles(): Promise<void> {
    await this._writeObjectToJsonFile(this._canvas, this._canvasJsonPath);
    await this._writeObjectToJsonFile(this._workflow, this._workflowJsonPath);
  }

  private async _writeObjectToJsonFile(
    object: Record<string, unknown>,
    path: string
  ): Promise<void> {
    const data = JSON.stringify(object, null, 2);
    await fsp.writeFile(path, data, { encoding: "utf-8" });
  }

  public async _initRepo(): Promise<void> {
    await git.init(this._repo);
    await this.commit(
      config.defaultCommitAuthorName,
      config.defaultCommitAuthorEmail,
      "Initial commit"
    );
  }

  private async _resolveHead(): Promise<string> {
    return await git.resolveRef({ ...this._repo, ref: "HEAD" });
  }

  private async _resolveMain(): Promise<string> {
    return await git.resolveRef({ ...this._repo, ref: Project.mainBranch });
  }

  private async _checkout(commitRef: string): Promise<void> {
    // Discard any current changes to the existing branch and then attempt to
    // checkout to the given ref
    await git.checkout({
      ...this._repo,
      force: true,
      filepaths: ["."],
    });

    if (commitRef == this.latestCommit) {
      await git.checkout({
        ...this._repo,
        ref: Project.mainBranch,
      });
    } else {
      await git.checkout({
        ...this._repo,
        ref: commitRef,
      });
    }
  }

  private async _modifiedFiles(): Promise<Array<string>> {
    const FILE = 0;
    const HEAD = 1;
    const WORKDIR = 2;
    const modifiedFiles = (await git.statusMatrix({ ...this._repo }))
      .filter((row) => row[HEAD] !== row[WORKDIR])
      .map((row) => row[FILE]);
    return modifiedFiles;
  }

  get id(): string {
    return this._id;
  }

  get path(): string {
    return this._path;
  }

  get name(): string {
    return this._name;
  }

  get canvas(): Record<string, unknown> {
    return this._canvas;
  }

  set canvas(canvas: Record<string, unknown>) {
    this._canvas = canvas;
    this._writeObjectToJsonFile(this._canvas, this._canvasJsonPath);
  }

  get workflow(): Record<string, unknown> {
    return this._workflow;
  }

  set workflow(workflow: Record<string, unknown>) {
    this._workflow = workflow;
    this._writeObjectToJsonFile(this._workflow, this._workflowJsonPath);
  }

  get currentCommit(): string {
    return this._currentCommit;
  }

  set currentCommit(commitRef: string) {
    this._checkout(commitRef);
    this._currentCommit = commitRef;
  }

  get latestCommit(): string {
    return this._latestCommit;
  }

  public async toJson(): Promise<ProjectJson> {
    return {
      id: this._id,
      type: Projects.type,
      attributes: {
        name: this._name,
        path: this._path,
        canvas: this._canvas,
        workflow: this._workflow,
        notebooks_dir: this._notebooksDir,
        current_commit: this._currentCommit,
        latest_commit: this._latestCommit,
        has_uncommitted_changes: (await this._modifiedFiles()).length > 0,
        port_range: this._portRange,
      },
    };
  }

  public async commit(
    authorName: string,
    authorEmail: string,
    message: string
  ): Promise<string> {
    // The following is equivalent to `git add -A .`
    await git
      .statusMatrix(this._repo)
      .then((status) =>
        Promise.all(
          status.map(([filepath, , workingTreeStatus]) =>
            workingTreeStatus
              ? git.add({ ...this._repo, filepath })
              : git.remove({ ...this._repo, filepath })
          )
        )
      );

    const currentBranch = await git.currentBranch({ ...this._repo });
    let tempBranch = "";
    // If we are in a detached head state, create a new branch from here
    if (currentBranch === undefined) {
      tempBranch = "temp";
      await git.branch({
        ...this._repo,
        ref: tempBranch,
        checkout: true,
      });
    }

    const commitRef = await git.commit({
      ...this._repo,
      author: {
        name: authorName ? authorName : config.defaultCommitAuthorName,
        email: authorEmail ? authorEmail : config.defaultCommitAuthorEmail,
      },
      message: message ? message : config.defaultCommitMessage,
    });

    // If we are on a temporary branch, delete the main branch and rename
    // temporary to be main.
    if (tempBranch) {
      await git.deleteBranch({
        ...this._repo,
        ref: Project.mainBranch,
      });
      await git.renameBranch({
        ...this._repo,
        oldref: tempBranch,
        ref: Project.mainBranch,
        checkout: true,
      });
    }

    this._latestCommit = commitRef;
    this._currentCommit = commitRef;
    return commitRef;
  }

  public async rename(name: string): Promise<void> {
    this._name = name;

    const projectDbPath = config.projectDbPath;
    let projectDbData = await fsp.readFile(projectDbPath, {
      encoding: "utf-8",
      flag: "r",
    });
    const projectDb = JSON.parse(projectDbData);
    const project = projectDb.find(
      (project: Project) => project.id === this._id
    );
    project.name = name;
    projectDbData = JSON.stringify(projectDb);
    await fsp.writeFile(projectDbPath, projectDbData, { encoding: "utf-8" });
  }

  public async delete(): Promise<void> {
    await this._removeProjectDir();
    await this._removeProjectEntryFromDb();
  }
}
