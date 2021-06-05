import * as uuid from "uuid";

interface ProjectJson extends Object {
  id: string;
  type: string;
}

class Project {
  private readonly _id: string;

  constructor(id = "") {
    this._id = id;

    // Create a new project if the project ID was empty
    if (this._id === "") {
      this._id = uuid.v4();

      // TODO: add creation logic
    } else {
      // TODO: add read logic
    }
  }

  get id(): string {
    return this._id;
  }

  public asJson(): ProjectJson {
    return {
      id: this._id,
      type: "projects",
    };
  }

  public delete(): void {
    return;
  }
}

export default Project;
