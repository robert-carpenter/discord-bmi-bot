import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from './config';
import { UserBmi } from './entity/UserBmi';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: config.databaseUrl,
  entities: [UserBmi],
  synchronize: true,
  logging: false,
});
