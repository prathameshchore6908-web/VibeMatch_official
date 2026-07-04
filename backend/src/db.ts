import sqlite3 from 'sqlite3';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Room, Participant } from './types';
import crypto from 'crypto';

export interface DatabaseAdapter {
  init(): Promise<void>;
  createRoom(id: string, host_id: string, host_ip: string, consent_date?: string, terms_version?: string): Promise<Room>;
  getRoom(id: string): Promise<Room | null>;
  getRoomsCreatedByIpInLast24Hours(ip: string): Promise<number>;
  getRoomsCreatedByHostInLast24Hours(host_id: string): Promise<number>;
  cancelAllRoomsByIp(ip: string): Promise<void>;
  joinRoom(roomId: string, nickname: string, ipAddress: string, consent_date?: string, terms_version?: string): Promise<Participant>;
  getParticipants(roomId: string): Promise<Participant[]>;
  getParticipantInRoom(roomId: string, nickname: string): Promise<Participant | null>;
  submitPreferences(roomId: string, nickname: string, availability: string, budget: number, vibeText: string): Promise<void>;
  updateRoomResult(roomId: string, status: 'matched' | 'expired', result: string | null): Promise<void>;
  expireRoomsCron(): Promise<number>;
  close(): Promise<void>;
}

// ---------------------------------------------------------
// SQLite Adapter Implementation
// ---------------------------------------------------------
class SqliteAdapter implements DatabaseAdapter {
  private db!: sqlite3.Database;
  private dbPath: string;

  constructor(dbPath: string = 'db.sqlite') {
    this.dbPath = dbPath;
  }

  init(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) return reject(err);
        
        // Enable foreign key constraints
        this.db.run('PRAGMA foreign_keys = ON;', (err) => {
          if (err) return reject(err);
          
          this.db.serialize(() => {
            // Create rooms table
            this.db.run(`
              CREATE TABLE IF NOT EXISTS rooms (
                id TEXT PRIMARY KEY,
                host_id TEXT NOT NULL,
                host_ip TEXT NOT NULL,
                status TEXT CHECK(status IN ('active', 'matched', 'expired')) NOT NULL,
                final_result TEXT,
                created_at TEXT NOT NULL
              )
            `);

            // Create participants table
            this.db.run(`
              CREATE TABLE IF NOT EXISTS participants (
                id TEXT PRIMARY KEY,
                room_id TEXT NOT NULL,
                nickname TEXT NOT NULL,
                ip_address TEXT NOT NULL,
                availability TEXT,
                budget INTEGER,
                vibe_text TEXT,
                has_submitted INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE,
                UNIQUE (room_id, nickname)
              )
            `, (err) => {
              if (err) return reject(err);
              
              // Run migrations silently to add consent columns if they do not exist in existing tables
              this.db.serialize(() => {
                this.db.run("ALTER TABLE rooms ADD COLUMN consent_date TEXT;", () => {});
                this.db.run("ALTER TABLE rooms ADD COLUMN terms_version TEXT;", () => {});
                this.db.run("ALTER TABLE participants ADD COLUMN consent_date TEXT;", () => {});
                this.db.run("ALTER TABLE participants ADD COLUMN terms_version TEXT;", () => {
                  resolve();
                });
              });
            });
          });
        });
      });
    });
  }

  createRoom(id: string, host_id: string, host_ip: string, consent_date?: string, terms_version?: string): Promise<Room> {
    return new Promise((resolve, reject) => {
      const createdAt = new Date().toISOString();
      const status = 'active';
      const consentDate = consent_date || null;
      const termsVersion = terms_version || null;
      this.db.run(
        'INSERT INTO rooms (id, host_id, host_ip, status, final_result, created_at, consent_date, terms_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, host_id, host_ip, status, null, createdAt, consentDate, termsVersion],
        (err) => {
          if (err) return reject(err);
          resolve({ 
            id, 
            host_id, 
            host_ip, 
            status, 
            final_result: null, 
            created_at: createdAt, 
            consent_date: consentDate, 
            terms_version: termsVersion 
          });
        }
      );
    });
  }

  getRoom(id: string): Promise<Room | null> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM rooms WHERE id = ?', [id], (err, row: any) => {
        if (err) return reject(err);
        if (!row) return resolve(null);
        resolve(row as Room);
      });
    });
  }

  getRoomsCreatedByIpInLast24Hours(ip: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      this.db.get(
        'SELECT COUNT(*) as count FROM rooms WHERE host_ip = ? AND created_at > ?',
        [ip, yesterday],
        (err, row: any) => {
          if (err) return reject(err);
          resolve(row?.count || 0);
        }
      );
    });
  }

  getRoomsCreatedByHostInLast24Hours(host_id: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      this.db.get(
        'SELECT COUNT(*) as count FROM rooms WHERE host_id = ? AND created_at > ?',
        [host_id, yesterday],
        (err, row: any) => {
          if (err) return reject(err);
          resolve(row?.count || 0);
        }
      );
    });
  }

  cancelAllRoomsByIp(ip: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // In SQLite, cascade delete is configured on participants table.
      // So deleting the rooms from rooms table automatically deletes participants.
      this.db.run('DELETE FROM rooms WHERE host_ip = ?', [ip], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  joinRoom(roomId: string, nickname: string, ipAddress: string, consent_date?: string, terms_version?: string): Promise<Participant> {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const consentDate = consent_date || null;
      const termsVersion = terms_version || null;
      this.db.run(
        'INSERT INTO participants (id, room_id, nickname, ip_address, created_at, consent_date, terms_version) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, roomId, nickname, ipAddress, createdAt, consentDate, termsVersion],
        (err) => {
          if (err) {
            // Check for UNIQUE constraint violation
            if (err.message.includes('UNIQUE') || err.message.includes('constraint failed')) {
              return reject(new Error('NICKNAME_EXISTS'));
            }
            return reject(err);
          }
          resolve({
            id,
            room_id: roomId,
            nickname,
            ip_address: ipAddress,
            availability: '5PM-8PM',
            budget: 1,
            vibe_text: '',
            has_submitted: false,
            created_at: createdAt,
            consent_date: consentDate,
            terms_version: termsVersion
          });
        }
      );
    });
  }

  getParticipants(roomId: string): Promise<Participant[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM participants WHERE room_id = ?', [roomId], (err, rows) => {
        if (err) return reject(err);
        const mapped = rows.map((r: any) => ({
          ...r,
          has_submitted: r.has_submitted === 1
        }));
        resolve(mapped as Participant[]);
      });
    });
  }

  getParticipantInRoom(roomId: string, nickname: string): Promise<Participant | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM participants WHERE room_id = ? AND nickname = ?',
        [roomId, nickname],
        (err, row: any) => {
          if (err) return reject(err);
          if (!row) return resolve(null);
          resolve({
            ...row,
            has_submitted: row.has_submitted === 1
          } as Participant);
        }
      );
    });
  }

  submitPreferences(
    roomId: string,
    nickname: string,
    availability: string,
    budget: number,
    vibeText: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE participants 
         SET availability = ?, budget = ?, vibe_text = ?, has_submitted = 1 
         WHERE room_id = ? AND nickname = ?`,
        [availability, budget, vibeText, roomId, nickname],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  updateRoomResult(roomId: string, status: 'matched' | 'expired', result: string | null): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE rooms SET status = ?, final_result = ? WHERE id = ?',
        [status, result, roomId],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  expireRoomsCron(): Promise<number> {
    return new Promise((resolve, reject) => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      this.db.run(
        "UPDATE rooms SET status = 'expired' WHERE status = 'active' AND created_at < ?",
        [tenMinutesAgo],
        function (err) {
          if (err) return reject(err);
          resolve(this.changes);
        }
      );
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve();
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

// ---------------------------------------------------------
// Supabase Adapter Implementation
// ---------------------------------------------------------
class SupabaseAdapter implements DatabaseAdapter {
  private client: SupabaseClient;

  constructor(url: string, key: string) {
    this.client = createClient(url, key);
  }

  async init(): Promise<void> {
    // Tables are assumed to be pre-created in Supabase via schema script.
    // We can do a quick check query.
    try {
      await this.client.from('rooms').select('id').limit(1);
    } catch (err) {
      console.error('Failed connection check to Supabase. Make sure tables are created.', err);
      throw err;
    }
  }

  async createRoom(id: string, host_id: string, host_ip: string, consent_date?: string, terms_version?: string): Promise<Room> {
    const createdAt = new Date().toISOString();
    const { data, error } = await this.client
      .from('rooms')
      .insert([{ 
        id, 
        host_id, 
        host_ip, 
        status: 'active', 
        final_result: null, 
        created_at: createdAt,
        consent_date: consent_date || null,
        terms_version: terms_version || null
      }])
      .select()
      .single();

    if (error) throw error;
    return data as Room;
  }

  async getRoom(id: string): Promise<Room | null> {
    const { data, error } = await this.client
      .from('rooms')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as Room | null;
  }

  async getRoomsCreatedByIpInLast24Hours(ip: string): Promise<number> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await this.client
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .eq('host_ip', ip)
      .gt('created_at', yesterday);

    if (error) throw error;
    return count || 0;
  }

  async getRoomsCreatedByHostInLast24Hours(host_id: string): Promise<number> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await this.client
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .eq('host_id', host_id)
      .gt('created_at', yesterday);

    if (error) throw error;
    return count || 0;
  }

  async cancelAllRoomsByIp(ip: string): Promise<void> {
    const { error } = await this.client
      .from('rooms')
      .delete()
      .eq('host_ip', ip);

    if (error) throw error;
  }

  async joinRoom(roomId: string, nickname: string, ipAddress: string, consent_date?: string, terms_version?: string): Promise<Participant> {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const { data, error } = await this.client
      .from('participants')
      .insert([{ 
        id, 
        room_id: roomId, 
        nickname, 
        ip_address: ipAddress, 
        has_submitted: false,
        created_at: createdAt,
        consent_date: consent_date || null,
        terms_version: terms_version || null
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Postgres code for unique constraint violation
        throw new Error('NICKNAME_EXISTS');
      }
      throw error;
    }

    return {
      ...data,
      has_submitted: !!data.has_submitted
    } as Participant;
  }

  async getParticipants(roomId: string): Promise<Participant[]> {
    const { data, error } = await this.client
      .from('participants')
      .select('*')
      .eq('room_id', roomId);

    if (error) throw error;
    return (data || []).map(p => ({
      ...p,
      has_submitted: !!p.has_submitted
    })) as Participant[];
  }

  async getParticipantInRoom(roomId: string, nickname: string): Promise<Participant | null> {
    const { data, error } = await this.client
      .from('participants')
      .select('*')
      .eq('room_id', roomId)
      .eq('nickname', nickname)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return {
      ...data,
      has_submitted: !!data.has_submitted
    } as Participant;
  }

  async submitPreferences(
    roomId: string,
    nickname: string,
    availability: string,
    budget: number,
    vibeText: string
  ): Promise<void> {
    const { error } = await this.client
      .from('participants')
      .update({ availability, budget, vibe_text: vibeText, has_submitted: true })
      .eq('room_id', roomId)
      .eq('nickname', nickname);

    if (error) throw error;
  }

  async updateRoomResult(roomId: string, status: 'matched' | 'expired', result: string | null): Promise<void> {
    const { error } = await this.client
      .from('rooms')
      .update({ status, final_result: result })
      .eq('id', roomId);

    if (error) throw error;
  }

  async expireRoomsCron(): Promise<number> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data, error } = await this.client
      .from('rooms')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('created_at', tenMinutesAgo)
      .select();

    if (error) throw error;
    return data ? data.length : 0;
  }

  async close(): Promise<void> {
    // No explicit connection to close for REST Client
  }
}

// ---------------------------------------------------------
// Factory Method to Export Active Database Adapter
// ---------------------------------------------------------
export function getDatabaseAdapter(): DatabaseAdapter {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;

  if (url && key && url.trim() !== '' && key.trim() !== '') {
    console.log('Database initialized in SUPABASE mode.');
    return new SupabaseAdapter(url, key);
  } else {
    const nodeEnv = process.env.NODE_ENV;
    const dbFile = nodeEnv === 'test' ? ':memory:' : 'db.sqlite';
    console.log(`Database initialized in SQLITE mode (${dbFile}).`);
    return new SqliteAdapter(dbFile);
  }
}
