import { DataSourceOptions } from 'typeorm';
import { Issuer } from './modules/issuer/entities/issuer.entity';

const config: DataSourceOptions = {
  type: 'sqlite',
  database: 'data/db.sqlite',
  entities: [Issuer],
  // ... other config (synchronize, logging, migrations, etc.)
};

export default config; // Critical for default export