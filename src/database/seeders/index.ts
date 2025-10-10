import { seedDatabase } from "./seeder";

export const RunSeeders = async () => { 
    await seedDatabase();
};