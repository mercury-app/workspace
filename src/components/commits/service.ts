import { CommitJson } from "./model";
import { Project } from "../projects/model";

const commitsService = {
  readAll: async (project: Project): Promise<Array<CommitJson>> => {
    return;
  },

  create: async (
    project: Project,
    attributes: Record<string, any>
  ): Promise<CommitJson> => {
    return;
  },

  read: async (project: Project, id: string): Promise<CommitJson> => {
    return;
  },
};

export default commitsService;
