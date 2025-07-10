import { Database } from '../db/database';
import { Identity } from '../types/identity';

export class IdentityManager {
  private db: Database | null = null;

  constructor() {
    // Database will be initialized in async init method
  }

  public async init(): Promise<void> {
    this.db = await Database.getInstance();
  }

  /**
   * Generates a new identity with random gametag, emoji, and color
   */
  async generate(): Promise<Identity> {
    const adjectives = ['Cosmic', 'Stellar', 'Mystic', 'Azure', 'Golden'];
    const gametag = adjectives[Math.floor(Math.random() * adjectives.length)] + 
      Math.floor(1000 + Math.random() * 9000).toString();
    
    // Get approved emojis and colors from config
    const approvedEmojis = require('../../config/approved-emojis.json');
    const approvedColors = require('../../config/approved-colors.json');
    
    const emoji = approvedEmojis[Math.floor(Math.random() * approvedEmojis.length)];
    const color = approvedColors[Math.floor(Math.random() * approvedColors.length)];
    
    const now = new Date().toISOString();
    return {
      gametag,
      emoji,
      color,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Gets existing identity for a user or creates a new one
   */
  async getOrCreate(userId: string): Promise<Identity> {
    if (!this.db) {
      await this.init();
      if (!this.db) throw new Error('Failed to initialize database');
    }

    const user = await this.db.findUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.identityId) {
      const existingIdentity = await this.db.getIdentity(user.identityId);
      if (existingIdentity) {
        return existingIdentity;
      }
    }

    const newIdentity = await this.generate();
    const identity = await this.db.createIdentity(newIdentity);
    
    return identity;
  }
}
