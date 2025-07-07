export class Database {
  private static instance: Database;

  public static async getInstance(): Promise<Database> {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async createOrUpdateUser(identifier: string) {
    return {
      id: 'mock-user-id',
      identifier,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}
