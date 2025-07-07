export class Database {
  private static instance: Database;

  private constructor() {}

  public static getInstance(): Promise<Database> {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Promise.resolve(Database.instance);
  }

  public async createOrUpdateUser(identifier: string): Promise<any> {
    return Promise.resolve({
      id: 'mock-user-id',
      identifier,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
