import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRecurringAndCustomAvailabilityTables1784790834233 implements MigrationInterface {
    name = 'AddRecurringAndCustomAvailabilityTables1784790834233'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "custom_availabilities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" date NOT NULL, "startTime" TIME NOT NULL, "endTime" TIME NOT NULL, "doctorId" uuid, CONSTRAINT "PK_f15acb0917f78a34b135afeec8c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."recurring_availabilities_dayofweek_enum" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')`);
        await queryRunner.query(`CREATE TABLE "recurring_availabilities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "dayOfWeek" "public"."recurring_availabilities_dayofweek_enum" NOT NULL, "startTime" TIME NOT NULL, "endTime" TIME NOT NULL, "doctorId" uuid, CONSTRAINT "PK_f6ee35ff4cdc7d4b1f3cf6eeb1c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "custom_availabilities" ADD CONSTRAINT "FK_85d03cc0bee30c4f72f4ac00463" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "recurring_availabilities" ADD CONSTRAINT "FK_83f738fc97c2ad1b48afc93c4ba" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "recurring_availabilities" DROP CONSTRAINT "FK_83f738fc97c2ad1b48afc93c4ba"`);
        await queryRunner.query(`ALTER TABLE "custom_availabilities" DROP CONSTRAINT "FK_85d03cc0bee30c4f72f4ac00463"`);
        await queryRunner.query(`DROP TABLE "recurring_availabilities"`);
        await queryRunner.query(`DROP TYPE "public"."recurring_availabilities_dayofweek_enum"`);
        await queryRunner.query(`DROP TABLE "custom_availabilities"`);
    }

}
