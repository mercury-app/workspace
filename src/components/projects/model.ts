import * as fs from "fs";
import * as fsp from "fs/promises";
import * as uuid from "uuid";
import git from "isomorphic-git";

import config from "../../config";

interface ProjectDbEntry extends Object {
  id: string;
  name: string;
}

export interface ProjectJson extends Object {
  id: string;
  type: string;
  attributes?: {
    name: string;
    path: string;
    canvas: Record<string, unknown>;
    dag: Record<string, unknown>;
    notebooks_dir: string;
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
  private static readonly _dagJsonFilename = "dag.json";

  private readonly _id: string;
  private readonly _name: string;
  private readonly _path: string;
  private readonly _stateFilesDir: string;
  private readonly _notebooksDir: string;
  private readonly _canvasJsonPath: string;
  private readonly _dagJsonPath: string;
  private _canvas: Record<string, unknown>;
  private _dag: Record<string, unknown>;
  private _repo: { fs: typeof fs; dir: string };

  static async make(name: string): Promise<Project> {
    const id = uuid.v4();
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
    await project._readProjectFiles();
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
    this._dagJsonPath = `${this._stateFilesDir}/${Project._dagJsonFilename}`;
    this._canvas = {};
    this._dag = {};

    // A convenience structure that is passed in calls to isomorphic git APIs
    this._repo = { fs: fs, dir: this._path };
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
    const projectDb = JSON.parse(projectDbData);
    const projectEntry: ProjectDbEntry = {
      id: this._id,
      name: this._name,
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
    projectDb = projectDb.filter((project: Project) => project.id !== this._id);
    projectDbData = JSON.stringify(projectDb);
    await fsp.writeFile(projectDbPath, projectDbData, { encoding: "utf-8" });
  }

  private async _readProjectFiles(): Promise<void> {
    this._canvas = await this._readJsonFileAsObject(this._canvasJsonPath);
    this._dag = await this._readJsonFileAsObject(this._dagJsonPath);
  }

  private async _readJsonFileAsObject(
    path: string
  ): Promise<Record<string, unknown>> {
    const data = await fsp.readFile(path, { encoding: "utf-8", flag: "r" });
    return JSON.parse(data);
  }

  private async _writeProjectFiles(): Promise<void> {
    await this._writeObjectToJsonFile(this._canvas, this._canvasJsonPath);
    await this._writeObjectToJsonFile(this._dag, this._dagJsonPath);
  }

  private async _writeObjectToJsonFile(
    object: Record<string, unknown>,
    path: string
  ): Promise<void> {
    const data = JSON.stringify(object);
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

  get id(): string {
    return this._id;
  }

  get path(): string {
    return this._path;
  }

  get canvas(): Record<string, unknown> {
    return this._canvas;
  }

  set canvas(canvas: Record<string, unknown>) {
    this._canvas = canvas;
    this._writeObjectToJsonFile(this._canvas, this._canvasJsonPath);
  }

  get dag(): Record<string, unknown> {
    return this._dag;
  }

  set dag(dag: Record<string, unknown>) {
    this._dag = dag;
    this._writeObjectToJsonFile(this._dag, this._dagJsonPath);
  }

  public toJson(): ProjectJson {
    return {
      id: this._id,
      type: Projects.type,
      attributes: {
        name: this._name,
        path: this._path,
        canvas: this._canvas,
        dag: this._dag,
        notebooks_dir: this._notebooksDir,
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

    const sha = await git.commit({
      ...this._repo,
      author: {
        name: authorName ? authorName : config.defaultCommitAuthorName,
        email: authorEmail ? authorEmail : config.defaultCommitAuthorEmail,
      },
      message: message ? message : config.defaultCommitMessage,
    });

    return sha;
  }

  public async delete(): Promise<void> {
    await this._removeProjectDir();
    await this._removeProjectEntryFromDb();
  }
}
