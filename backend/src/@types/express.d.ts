declare global {
  namespace Express {
    export interface Request {
      user?: {
        id: string;
        role: string;
      };
      file?: Express.Multer.File;
      files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
    }
  }
}

export {};
